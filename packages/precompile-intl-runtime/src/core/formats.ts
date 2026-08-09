import type {
  DateTimeFormatOptions,
  Formats,
  MessageContext,
  NumberFormatOptions,
  PartialFormats,
} from '../types/index.js';

export const defaultFormats: Formats = Object.freeze({
  number: Object.freeze({
    scientific: Object.freeze({ notation: 'scientific' }),
    engineering: Object.freeze({ notation: 'engineering' }),
    compactLong: Object.freeze({ notation: 'compact', compactDisplay: 'long' }),
    compactShort: Object.freeze({ notation: 'compact', compactDisplay: 'short' }),
  }),
  date: Object.freeze({
    short: Object.freeze({ month: 'numeric', day: 'numeric', year: '2-digit' }),
    medium: Object.freeze({ month: 'short', day: 'numeric', year: 'numeric' }),
    long: Object.freeze({ month: 'long', day: 'numeric', year: 'numeric' }),
    full: Object.freeze({
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  }),
  time: Object.freeze({
    short: Object.freeze({ hour: 'numeric', minute: 'numeric' }),
    medium: Object.freeze({ hour: 'numeric', minute: 'numeric', second: 'numeric' }),
    long: Object.freeze({
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
    }),
    full: Object.freeze({
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'long',
    }),
  }),
});

export function createFormats(formats: PartialFormats = {}): Formats {
  if (
    Object.keys(formats.number ?? {}).length === 0 &&
    Object.keys(formats.date ?? {}).length === 0 &&
    Object.keys(formats.time ?? {}).length === 0
  ) {
    return defaultFormats;
  }

  return Object.freeze({
    number: Object.freeze({ ...defaultFormats.number, ...formats.number }),
    date: Object.freeze({ ...defaultFormats.date, ...formats.date }),
    time: Object.freeze({ ...defaultFormats.time, ...formats.time }),
  });
}

export function createMessageContext(locale: string, formats: Formats): MessageContext {
  return Object.freeze({ locale, formats });
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const namedNumberFormatters = new WeakMap<Formats, Map<string, Intl.NumberFormat>>();
const namedDateFormatters = new WeakMap<Formats, Map<string, Intl.DateTimeFormat>>();
const cardinalPluralRules: Record<string, Intl.PluralRules> = Object.create(null);
const ordinalPluralRules: Record<string, Intl.PluralRules> = Object.create(null);

function stableOptionsKey(options: object): string {
  return JSON.stringify(
    Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function resolveNamedFormat<T extends Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>(
  context: MessageContext,
  type: keyof Formats,
  format: string,
): T {
  const options = context.formats[type][format];
  if (!options) {
    throw new Error(`[precompile-intl-runtime] Unknown "${format}" ${type} format.`);
  }
  return options as T;
}

export function getNumberFormatter(
  context: MessageContext,
  options: NumberFormatOptions | string = {},
): Intl.NumberFormat {
  const normalized = typeof options === 'string' ? { format: options } : options;
  const { locale = context.locale, format, ...inlineOptions } = normalized;
  if (format) {
    let formatters = namedNumberFormatters.get(context.formats);
    if (!formatters) {
      formatters = new Map();
      namedNumberFormatters.set(context.formats, formatters);
    }
    const namedKey = `${locale}\u0000${format}`;
    let formatter = formatters.get(namedKey);
    if (!formatter) {
      formatter = new Intl.NumberFormat(
        locale,
        resolveNamedFormat<Intl.NumberFormatOptions>(context, 'number', format),
      );
      formatters.set(namedKey, formatter);
    }
    return formatter;
  }

  const intlOptions = inlineOptions;
  const key = `${locale}\u0000${stableOptionsKey(intlOptions)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, intlOptions);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function getDateTimeFormatter(
  context: MessageContext,
  type: 'date' | 'time',
  options: DateTimeFormatOptions | string = {},
): Intl.DateTimeFormat {
  const normalized = typeof options === 'string' ? { format: options } : options;
  const { locale = context.locale, format, ...inlineOptions } = normalized;
  const namedFormat = format ?? (Object.keys(inlineOptions).length === 0 ? 'short' : undefined);
  if (namedFormat) {
    let formatters = namedDateFormatters.get(context.formats);
    if (!formatters) {
      formatters = new Map();
      namedDateFormatters.set(context.formats, formatters);
    }
    const namedKey = `${type}\u0000${locale}\u0000${namedFormat}`;
    let formatter = formatters.get(namedKey);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(
        locale,
        resolveNamedFormat<Intl.DateTimeFormatOptions>(context, type, namedFormat),
      );
      formatters.set(namedKey, formatter);
    }
    return formatter;
  }

  const hasInlineOptions = Object.keys(inlineOptions).length > 0;
  const intlOptions = hasInlineOptions ? inlineOptions : {};
  const key = `${type}\u0000${locale}\u0000${stableOptionsKey(intlOptions)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, intlOptions);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function getDateFormatter(
  context: MessageContext,
  options: DateTimeFormatOptions | string = {},
): Intl.DateTimeFormat {
  return getDateTimeFormatter(context, 'date', options);
}

export function getTimeFormatter(
  context: MessageContext,
  options: DateTimeFormatOptions | string = {},
): Intl.DateTimeFormat {
  return getDateTimeFormatter(context, 'time', options);
}

export function getPluralRules(
  locale: string,
  type: Intl.PluralRulesOptions['type'] = 'cardinal',
): Intl.PluralRules {
  const cache = type === 'ordinal' ? ordinalPluralRules : cardinalPluralRules;
  let rules = cache[locale];
  if (!rules) {
    rules = new Intl.PluralRules(locale, { type });
    cache[locale] = rules;
  }
  return rules;
}
