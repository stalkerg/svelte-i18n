import {
  createFormats,
  createMessageContext,
  getDateFormatter,
  getNumberFormatter,
  getTimeFormatter,
} from './core/formats.js';
import { loadCatalog } from './core/loaders.js';
import { getPossibleLocales } from './core/locales.js';
import { lookup, mergeCatalogs } from './core/lookup.js';
import type {
  Catalog,
  Catalogs,
  DateTimeFormatOptions,
  Formats,
  I18nOptions,
  Locale,
  LocaleLoaders,
  Message,
  MessageContext,
  MessageKey,
  MessageValues,
  NumberFormatOptions,
  TranslateArguments,
  TranslateOptions,
} from './types/index.js';

const MISSING_MESSAGE = Symbol('missing message');
const EMPTY_VALUES: MessageValues = Object.freeze({});
type CachedMessage = Message | typeof MISSING_MESSAGE;

class I18nState {
  #locale = $state('');
  #loadedCatalogs = $state.raw<Catalogs>({});
  #overlays = $state.raw<Catalogs>({});
  #loading = $state(false);
  #error = $state<unknown>(undefined);

  readonly #baseCatalogs: Catalogs;
  readonly #fallbackLocale: string;
  readonly #formats: Formats;
  readonly #loaders: LocaleLoaders;
  readonly #loadingDelay: number;
  readonly #warnOnMissingMessages: boolean;
  readonly #contexts = new Map<string, MessageContext>();
  readonly #loadedLocales: Set<string>;
  readonly #activeLocaleLoads = new Map<string, Promise<void>>();

  #messageCaches: Record<string, Record<string, CachedMessage>> = Object.create(null);
  #currentMessageCache: Record<string, CachedMessage> = Object.create(null);
  #currentContext: MessageContext | undefined;
  #localeGeneration = 0;
  #activeLoadCount = 0;
  #loadingTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: I18nOptions) {
    if (!options.locale) throw new Error('[precompile-intl-runtime] "locale" is required.');
    this.#locale = options.locale;
    this.#fallbackLocale = options.fallbackLocale ?? '';
    this.#baseCatalogs = options.messages ?? {};
    this.#loaders = options.loaders ?? {};
    this.#formats = createFormats(options.formats);
    this.#loadingDelay = options.loadingDelay ?? 200;
    this.#warnOnMissingMessages = options.warnOnMissingMessages ?? true;
    this.#loadedLocales = new Set(Object.keys(this.#baseCatalogs));
    this.#messageCaches[this.#locale] = this.#currentMessageCache;
  }

  get locale(): Locale {
    return this.#locale as Locale;
  }

  get fallbackLocale(): Locale | '' {
    return this.#fallbackLocale as Locale | '';
  }

  get isLoading(): boolean {
    return this.#loading;
  }

  get error(): unknown {
    return this.#error;
  }

  get locales(): Locale[] {
    return [
      ...new Set([
        ...Object.keys(this.#baseCatalogs),
        ...Object.keys(this.#loadedCatalogs),
        ...Object.keys(this.#overlays),
        ...Object.keys(this.#loaders),
      ]),
    ].sort() as Locale[];
  }

  /** Returns shared base catalogs unless this instance has local additions. */
  get catalogs(): Catalogs {
    if (
      Object.keys(this.#loadedCatalogs).length === 0 &&
      Object.keys(this.#overlays).length === 0
    ) {
      return this.#baseCatalogs;
    }

    const catalogs: Record<string, Catalog> = { ...this.#baseCatalogs };
    for (const source of [this.#loadedCatalogs, this.#overlays]) {
      for (const [locale, catalog] of Object.entries(source)) {
        catalogs[locale] = mergeCatalogs(catalogs[locale], catalog);
      }
    }
    return Object.freeze(catalogs);
  }

  t<Key extends MessageKey>(id: Key, ...args: TranslateArguments<Key>): string;
  t(id: string, values: MessageValues = EMPTY_VALUES, options?: TranslateOptions): string {
    const requestedLocale = options?.locale;
    const locale = requestedLocale ?? this.#locale;
    let localeCache =
      requestedLocale === undefined || requestedLocale === this.#locale
        ? this.#currentMessageCache
        : this.#messageCaches[locale];
    let cached = localeCache?.[id];
    if (cached === undefined) {
      const message = lookup(
        id,
        locale,
        this.#fallbackLocale,
        this.#overlays,
        this.#loadedCatalogs,
        this.#baseCatalogs,
      );
      if (!localeCache) {
        localeCache = Object.create(null) as Record<string, CachedMessage>;
        this.#messageCaches[locale] = localeCache;
      }
      cached = localeCache[id] = message ?? MISSING_MESSAGE;
    }
    const message = cached === MISSING_MESSAGE ? undefined : cached;

    if (typeof message === 'string') return message;
    if (typeof message === 'function') return message(this.#contextFor(locale), values);

    if (this.#warnOnMissingMessages) {
      console.warn(
        `[precompile-intl-runtime] The message "${id}" was not found in "${getPossibleLocales(
          locale,
          this.#fallbackLocale,
        ).join('", "')}".`,
      );
    }
    return options?.default ?? id;
  }

  formatNumber(value: number, options: NumberFormatOptions | string = {}): string {
    return getNumberFormatter(this.#contextFor(this.#locale), options).format(value);
  }

  formatDate(value: Date | number, options: DateTimeFormatOptions | string = {}): string {
    return getDateFormatter(this.#contextFor(this.#locale), options).format(value);
  }

  formatTime(value: Date | number, options: DateTimeFormatOptions | string = {}): string {
    return getTimeFormatter(this.#contextFor(this.#locale), options).format(value);
  }

  addMessages(locale: Locale, ...partials: readonly Catalog[]): void {
    let next = this.#overlays[locale] ?? {};
    for (const partial of partials) next = mergeCatalogs(next, partial);
    this.#overlays = Object.freeze({ ...this.#overlays, [locale]: next });
    this.#clearMessageCache();
  }

  /** Install a complete catalog that was resolved before render or hydration. */
  setMessages(locale: Locale, ...catalogs: readonly Catalog[]): void {
    const [first, ...rest] = catalogs;
    if (!first) return;
    const current = this.#loadedCatalogs[locale];
    let next = current ? mergeCatalogs(current, first) : first;
    for (const catalog of rest) next = mergeCatalogs(next, catalog);
    this.#loadedCatalogs = Object.freeze({ ...this.#loadedCatalogs, [locale]: next });
    this.#loadedLocales.add(locale);
    this.#clearMessageCache();
  }

  async loadLocale(locale: Locale = this.#locale as Locale): Promise<void> {
    const active = this.#activeLocaleLoads.get(locale);
    if (active) return active;

    const locales = getPossibleLocales(locale, this.#fallbackLocale).reverse();
    const localesToLoad = locales.filter(
      (candidate) => !this.#loadedLocales.has(candidate) && this.#loaders[candidate],
    );
    if (localesToLoad.length === 0) return;

    const promise = this.#loadLocales(localesToLoad);
    this.#activeLocaleLoads.set(locale, promise);
    try {
      await promise;
    } finally {
      this.#activeLocaleLoads.delete(locale);
    }
  }

  async setLocale(locale: Locale): Promise<void> {
    if (!locale) throw new Error('[precompile-intl-runtime] "locale" cannot be empty.');
    const generation = ++this.#localeGeneration;
    await this.loadLocale(locale);
    if (generation === this.#localeGeneration) {
      this.#locale = locale;
      this.#currentMessageCache =
        this.#messageCaches[locale] ?? (Object.create(null) as Record<string, CachedMessage>);
      this.#messageCaches[locale] = this.#currentMessageCache;
      this.#currentContext = this.#contexts.get(locale);
    }
  }

  #contextFor(locale: string): MessageContext {
    if (locale === this.#locale && this.#currentContext) return this.#currentContext;
    let context = this.#contexts.get(locale);
    if (!context) {
      context = createMessageContext(locale, this.#formats);
      this.#contexts.set(locale, context);
    }
    if (locale === this.#locale) this.#currentContext = context;
    return context;
  }

  #clearMessageCache(): void {
    this.#messageCaches = Object.create(null);
    this.#currentMessageCache = Object.create(null) as Record<string, CachedMessage>;
    this.#messageCaches[this.#locale] = this.#currentMessageCache;
  }

  async #loadLocales(locales: string[]): Promise<void> {
    this.#startLoading();
    this.#error = undefined;
    try {
      await Promise.all(
        locales.map(async (locale) => {
          const configured = this.#loaders[locale];
          if (!configured) return;
          const loaders = Array.isArray(configured) ? configured : [configured];
          const catalogs = await Promise.all(loaders.map(loadCatalog));
          this.setMessages(locale as Locale, ...catalogs);
        }),
      );
    } catch (error) {
      this.#error = error;
      throw error;
    } finally {
      this.#stopLoading();
    }
  }

  #startLoading(): void {
    this.#activeLoadCount += 1;
    if (this.#activeLoadCount !== 1) return;
    if (this.#loadingDelay <= 0) {
      this.#loading = true;
      return;
    }
    this.#loadingTimer = setTimeout(() => {
      if (this.#activeLoadCount > 0) this.#loading = true;
    }, this.#loadingDelay);
  }

  #stopLoading(): void {
    this.#activeLoadCount = Math.max(0, this.#activeLoadCount - 1);
    if (this.#activeLoadCount !== 0) return;
    if (this.#loadingTimer) clearTimeout(this.#loadingTimer);
    this.#loadingTimer = undefined;
    this.#loading = false;
  }
}

export interface Translate {
  <Key extends MessageKey>(id: Key, ...args: TranslateArguments<Key>): string;
}

export interface I18n extends Translate {
  /** Backwards-compatible alias. The callable instance and `t` are identical. */
  readonly t: Translate;
  readonly locale: Locale;
  readonly fallbackLocale: Locale | '';
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly locales: Locale[];
  readonly catalogs: Catalogs;
  formatNumber(value: number, options?: NumberFormatOptions | string): string;
  formatDate(value: Date | number, options?: DateTimeFormatOptions | string): string;
  formatTime(value: Date | number, options?: DateTimeFormatOptions | string): string;
  addMessages(locale: Locale, ...partials: readonly Catalog[]): void;
  setMessages(locale: Locale, ...catalogs: readonly Catalog[]): void;
  loadLocale(locale?: Locale): Promise<void>;
  setLocale(locale: Locale): Promise<void>;
}

interface I18nConstructor {
  new (options: I18nOptions): I18n;
  readonly prototype: I18n;
}

const I18N_STATE = Symbol('precompile-intl-runtime.I18nState');
type I18nWithState = I18n & { readonly [I18N_STATE]: I18nState };

function stateOf(instance: I18n): I18nState {
  const state = (instance as I18nWithState)[I18N_STATE];
  if (!state) throw new TypeError('[precompile-intl-runtime] Invalid I18n receiver.');
  return state;
}

function I18nFactory(options: I18nOptions): I18n {
  const state = new I18nState(options);
  // Keep explicit parameters on the hot path; a rest array costs more than the
  // lookup for cached plain messages.
  const instance = ((id: string, values?: MessageValues, translateOptions?: TranslateOptions) =>
    state.t(id, values, translateOptions)) as I18nWithState;
  Object.defineProperty(instance, I18N_STATE, { value: state });
  Object.setPrototypeOf(instance, I18nFactory.prototype);
  return instance;
}

I18nFactory.prototype = Object.create(Function.prototype, {
  constructor: { value: I18nFactory, configurable: true, writable: true },
  t: {
    get(this: I18n) {
      return this;
    },
  },
  locale: {
    get(this: I18n) {
      return stateOf(this).locale;
    },
  },
  fallbackLocale: {
    get(this: I18n) {
      return stateOf(this).fallbackLocale;
    },
  },
  isLoading: {
    get(this: I18n) {
      return stateOf(this).isLoading;
    },
  },
  error: {
    get(this: I18n) {
      return stateOf(this).error;
    },
  },
  locales: {
    get(this: I18n) {
      return stateOf(this).locales;
    },
  },
  catalogs: {
    get(this: I18n) {
      return stateOf(this).catalogs;
    },
  },
  formatNumber: {
    value(this: I18n, value: number, options: NumberFormatOptions | string = {}) {
      return stateOf(this).formatNumber(value, options);
    },
  },
  formatDate: {
    value(this: I18n, value: Date | number, options: DateTimeFormatOptions | string = {}) {
      return stateOf(this).formatDate(value, options);
    },
  },
  formatTime: {
    value(this: I18n, value: Date | number, options: DateTimeFormatOptions | string = {}) {
      return stateOf(this).formatTime(value, options);
    },
  },
  addMessages: {
    value(this: I18n, locale: Locale, ...partials: readonly Catalog[]) {
      stateOf(this).addMessages(locale, ...partials);
    },
  },
  setMessages: {
    value(this: I18n, locale: Locale, ...catalogs: readonly Catalog[]) {
      stateOf(this).setMessages(locale, ...catalogs);
    },
  },
  loadLocale: {
    value(this: I18n, locale?: Locale) {
      return stateOf(this).loadLocale(locale);
    },
  },
  setLocale: {
    value(this: I18n, locale: Locale) {
      return stateOf(this).setLocale(locale);
    },
  },
});

export const I18n = I18nFactory as unknown as I18nConstructor;

export function isI18n(value: unknown): value is I18n {
  return typeof value === 'function' && I18N_STATE in value;
}

export function createI18n(options: I18nOptions): I18n {
  return new I18n(options);
}
