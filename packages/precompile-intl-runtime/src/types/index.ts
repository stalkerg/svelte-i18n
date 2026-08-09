declare global {
  namespace SvelteIcu {
    /** Extended by the declaration file generated from the application's locale files. */
    interface LocaleRegistry {}

    /** Extended by the declaration file generated from the application's ICU messages. */
    interface MessageRegistry {}
  }
}

export interface Formats {
  readonly number: Readonly<Record<string, Intl.NumberFormatOptions>>;
  readonly date: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
  readonly time: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
}

export type PartialFormats = {
  readonly [Type in keyof Formats]?: Formats[Type];
};

export interface MessageContext {
  readonly locale: string;
  readonly formats: Formats;
}

export type MessageValues = Readonly<Record<string, unknown>>;
export type NoMessageValues = Readonly<Record<string, never>>;
export type MessageFunction = (context: MessageContext, values: MessageValues) => string;
export type Message = string | MessageFunction;

type RegisteredLocale = Extract<keyof SvelteIcu.LocaleRegistry, string>;
type RegisteredMessageKey = Extract<keyof SvelteIcu.MessageRegistry, string>;
type HasRegisteredMessages = [RegisteredMessageKey] extends [never] ? false : true;

export type Locale = [RegisteredLocale] extends [never] ? string : RegisteredLocale;
export type MessageKey = [RegisteredMessageKey] extends [never] ? string : RegisteredMessageKey;
export type MessageValuesFor<Key extends MessageKey> = Key extends keyof SvelteIcu.MessageRegistry
  ? SvelteIcu.MessageRegistry[Key] extends MessageValues
    ? SvelteIcu.MessageRegistry[Key]
    : MessageValues
  : MessageValues;

export type TranslateArguments<Key extends MessageKey> = HasRegisteredMessages extends false
  ? [values?: MessageValues, options?: TranslateOptions]
  : MessageValuesFor<Key> extends NoMessageValues
    ? [values?: NoMessageValues, options?: TranslateOptions]
    : [values: MessageValuesFor<Key>, options?: TranslateOptions];

export interface Catalog {
  readonly [key: string]: Message | Catalog;
}

export type Catalogs = Readonly<Record<string, Catalog>>;
export type LoadedCatalog = Catalog | { readonly default: Catalog };
export type MessagesLoader = () => Promise<LoadedCatalog>;
export type LocaleLoaders = Readonly<Record<string, MessagesLoader | readonly MessagesLoader[]>>;

export interface I18nOptions {
  readonly locale: Locale;
  readonly fallbackLocale?: Locale;
  readonly messages?: Catalogs;
  readonly loaders?: LocaleLoaders;
  readonly formats?: PartialFormats;
  readonly loadingDelay?: number;
  readonly warnOnMissingMessages?: boolean;
}

export interface TranslateOptions {
  readonly locale?: Locale;
  readonly default?: string;
}

export type NumberFormatOptions = Intl.NumberFormatOptions & {
  readonly format?: string;
  readonly locale?: string;
};

export type DateTimeFormatOptions = Intl.DateTimeFormatOptions & {
  readonly format?: string;
  readonly locale?: string;
};

export interface GetClientLocaleOptions {
  readonly navigator?: boolean;
  readonly hash?: string;
  readonly search?: string;
  readonly pathname?: RegExp;
  readonly hostname?: RegExp;
}
