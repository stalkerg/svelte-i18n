import {
  getDateFormatter,
  getNumberFormatter,
  getPluralRules,
  getTimeFormatter,
} from './core/formats.js';
import type { MessageContext } from './types/index.js';

type PluralFragment = string | number;
type PluralOptions = Readonly<Record<string | number, PluralFragment>>;

const PLURAL_KEYS = {
  zero: 'z',
  one: 'o',
  two: 't',
  few: 'f',
  many: 'm',
  other: 'h',
} as const;

function ownValue(options: PluralOptions, key: string | number): PluralFragment | undefined {
  return Object.hasOwn(options, key) ? options[key] : undefined;
}

export function __interpolate(value: unknown): string | number {
  return value === 0 ? 0 : value == null ? '' : String(value);
}

export function __plural(
  context: MessageContext,
  value: number,
  options: PluralOptions,
  type: Intl.PluralRulesOptions['type'] = 'cardinal',
): string {
  const exact = ownValue(options, value);
  if (exact !== undefined) return String(exact);
  const category = getPluralRules(context.locale, type).select(value);
  return String(ownValue(options, PLURAL_KEYS[category]) ?? '');
}

export function __offsetPlural(
  context: MessageContext,
  value: number,
  offset: number,
  options: PluralOptions,
  type: Intl.PluralRulesOptions['type'] = 'cardinal',
): string {
  const exact = ownValue(options, value);
  if (exact !== undefined) return String(exact);
  const category = getPluralRules(context.locale, type).select(value - offset);
  return String(ownValue(options, PLURAL_KEYS[category]) ?? '');
}

export function __select(value: unknown, options: Readonly<Record<string, unknown>>): string {
  const selected = ownValue(options as PluralOptions, String(value));
  return String(selected ?? ownValue(options as PluralOptions, 'other') ?? '');
}

export function __number(
  context: MessageContext,
  value: number,
  format: string | Intl.NumberFormatOptions = {},
): string {
  return getNumberFormatter(context, format).format(value);
}

export function __date(
  context: MessageContext,
  value: Date | number,
  format: string | Intl.DateTimeFormatOptions = 'short',
): string {
  return getDateFormatter(context, format).format(value);
}

export function __time(
  context: MessageContext,
  value: Date | number,
  format: string | Intl.DateTimeFormatOptions = 'short',
): string {
  return getTimeFormatter(context, format).format(value);
}
