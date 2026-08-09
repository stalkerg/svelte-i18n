import { describe, expect, it, vi } from 'vitest';
import {
  __date,
  __number,
  __offsetPlural,
  __plural,
  __select,
  createI18n,
  defaultFormats,
  getLocaleFromAcceptLanguageHeader,
  I18n,
  isI18n,
  type Catalog,
  type MessageContext,
} from '../dist/modules/index.js';

const englishContext: MessageContext = {
  locale: 'en-US',
  formats: defaultFormats,
};

describe('compiled message helpers', () => {
  it('uses the explicit locale for cardinal and ordinal plurals', () => {
    const options = { z: 'zero', o: 'one', t: 'two', f: 'few', m: 'many', h: 'other' };
    expect(__plural(englishContext, 1, options)).toBe('one');
    expect(__plural({ ...englishContext, locale: 'ar-EG' }, 6, options)).toBe('few');
    expect(__plural(englishContext, 2, options, 'ordinal')).toBe('two');
  });

  it('checks exact offset values before locale rules', () => {
    expect(
      __offsetPlural(englishContext, 2, 1, {
        0: 'empty',
        1: 'alone',
        o: 'one other',
        h: 'many others',
      }),
    ).toBe('one other');
  });

  it('formats using explicit context and configured formats', () => {
    const context: MessageContext = {
      locale: 'de-DE',
      formats: {
        ...defaultFormats,
        number: { ...defaultFormats.number, eur: { style: 'currency', currency: 'EUR' } },
      },
    };
    expect(__number(context, 12345678)).toBe('12.345.678');
    expect(__number(context, 25, 'eur')).toContain('25,00');
    expect(__date(englishContext, new Date(2013, 9, 18), 'medium')).toBe('Oct 18, 2013');
    expect(__select('unknown', { known: 'Known', other: 'Other' })).toBe('Other');
  });

  it('does not share named formatters between different format configurations', () => {
    const usdContext: MessageContext = {
      locale: 'en-US',
      formats: {
        ...defaultFormats,
        number: { ...defaultFormats.number, money: { style: 'currency', currency: 'USD' } },
      },
    };
    const eurContext: MessageContext = {
      locale: 'en-US',
      formats: {
        ...defaultFormats,
        number: { ...defaultFormats.number, money: { style: 'currency', currency: 'EUR' } },
      },
    };

    expect(__number(usdContext, 10, 'money')).toContain('$');
    expect(__number(eurContext, 10, 'money')).toContain('€');
  });
});

describe('request-scoped I18n instances', () => {
  const messages = {
    en: {
      greeting: (_context, values) => `Hello ${values.name}`,
      nested: { title: 'English title' },
    },
    ja: {
      greeting: (_context, values) => `こんにちは ${values.name}`,
      nested: { title: '日本語タイトル' },
    },
  } satisfies Record<string, Catalog>;

  it('is directly callable and keeps t as an identical bound alias', () => {
    const i18n = createI18n({ locale: 'en', messages });
    const t = i18n.t;

    expect(typeof i18n).toBe('function');
    expect(i18n('greeting', { name: 'Direct' })).toBe('Hello Direct');
    expect(t('greeting', { name: 'Alias' })).toBe('Hello Alias');
    expect(i18n.t).toBe(i18n);
    expect(i18n).toBeInstanceOf(I18n);
    expect(isI18n(i18n)).toBe(true);
    expect(i18n.formatNumber(1_234)).toBe('1,234');

    const constructed = new I18n({ locale: 'ja', messages });
    expect(constructed('greeting', { name: 'Constructor' })).toBe('こんにちは Constructor');
  });

  it('does not share locale or overlays between instances', async () => {
    const first = createI18n({ locale: 'en', messages });
    const second = createI18n({ locale: 'ja', messages });

    expect(first('greeting', { name: 'Alex' })).toBe('Hello Alex');
    expect(second('greeting', { name: 'Alex' })).toBe('こんにちは Alex');

    first.addMessages('en', { private: 'request A' });
    expect(first('private')).toBe('request A');
    expect(second('private', {}, { default: 'missing' })).toBe('missing');

    await first.setLocale('ja');
    expect(first.locale).toBe('ja');
    expect(second.locale).toBe('ja');
    await second.setLocale('en');
    expect(first.locale).toBe('ja');
    expect(second.locale).toBe('en');
  });

  it('deduplicates shared loader imports but keeps state per instance', async () => {
    const loader = vi.fn(async () => ({ greeting: 'Bonjour' }));
    const options = {
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { greeting: 'Hello' } },
      loaders: { fr: loader },
      loadingDelay: 0,
    };
    const first = createI18n(options);
    const second = createI18n(options);

    await Promise.all([first.setLocale('fr'), second.setLocale('fr')]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(first('greeting')).toBe('Bonjour');
    expect(second('greeting')).toBe('Bonjour');
    expect(first.isLoading).toBe(false);
    expect(second.isLoading).toBe(false);
  });

  it('installs a preloaded catalog without invoking its lazy loader again', async () => {
    const loader = vi.fn(async () => ({ greeting: 'Loader result' }));
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { greeting: 'Hello' } },
      loaders: { ja: loader },
    });

    i18n.setMessages('ja', { greeting: 'Preloaded result' });
    await i18n.setLocale('ja');

    expect(loader).not.toHaveBeenCalled();
    expect(i18n('greeting')).toBe('Preloaded result');
  });

  it('invalidates cached hits and misses when catalogs change', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { existing: 'Base value' } },
      warnOnMissingMessages: false,
    });

    expect(i18n('existing')).toBe('Base value');
    expect(i18n('late')).toBe('late');

    i18n.addMessages('en', { existing: 'Overlay value', late: 'Added later' });
    expect(i18n('existing')).toBe('Overlay value');
    expect(i18n('late')).toBe('Added later');

    i18n.setMessages('ja', { existing: 'Loaded value' });
    expect(i18n('existing', {}, { locale: 'ja' })).toBe('Loaded value');
  });

  it('does not let a stale loader completion change the selected locale', async () => {
    let resolveJapanese!: (catalog: Catalog) => void;
    const japanese = new Promise<Catalog>((resolve) => {
      resolveJapanese = resolve;
    });
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { value: 'English' } },
      loaders: {
        ja: () => japanese,
        fr: async () => ({ value: 'Français' }),
      },
      loadingDelay: 0,
    });

    const staleTransition = i18n.setLocale('ja');
    await i18n.setLocale('fr');
    resolveJapanese({ value: '日本語' });
    await staleTransition;

    expect(i18n.locale).toBe('fr');
    expect(i18n('value')).toBe('Français');
  });
});

describe('Accept-Language negotiation', () => {
  it.each([
    ['en-GB,en;q=0.9,es-ES;q=0.8', undefined, 'en-GB'],
    ['en-GB,en;q=0.9,es-ES;q=0.8', ['es-ES', 'en-us'], 'en-us'],
    ['en-GB,en;q=0.9,es-ES;q=0.8', ['es', 'de'], 'es'],
    ['fr,fr-CA;q=0.9,en;q=0.8', ['fr-FR', 'fr-CA'], 'fr-CA'],
    ['en-GB,en;q=0.9', ['de'], undefined],
    [null, ['en-US'], undefined],
  ] as const)('%s', (header, available, expected) => {
    expect(getLocaleFromAcceptLanguageHeader(header, available)).toBe(expected);
  });
});
