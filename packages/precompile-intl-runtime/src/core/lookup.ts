import { getPossibleLocales } from './locales.js';
import type { Catalog, Catalogs, Message } from '../types/index.js';

export function getMessageFromCatalog(catalog: Catalog, id: string): Message | undefined {
  if (Object.hasOwn(catalog, id)) {
    const exact = catalog[id];
    return typeof exact === 'string' || typeof exact === 'function' ? exact : undefined;
  }

  let current: Message | Catalog | undefined = catalog;
  for (const segment of id.split('.')) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' || typeof current === 'function' ? current : undefined;
}

export function lookup(
  id: string,
  locale: string,
  fallbackLocale: string,
  ...catalogSources: readonly Catalogs[]
): Message | undefined {
  for (const candidateLocale of getPossibleLocales(locale, fallbackLocale)) {
    for (const catalogs of catalogSources) {
      const catalog = catalogs[candidateLocale];
      if (!catalog) continue;
      const message = getMessageFromCatalog(catalog, id);
      if (message !== undefined) return message;
    }
  }
  return undefined;
}

export function mergeCatalogs(base: Catalog = {}, addition: Catalog): Catalog {
  const result: Record<string, Message | Catalog> = { ...base };
  for (const [key, value] of Object.entries(addition)) {
    const previous = result[key];
    result[key] =
      typeof previous === 'object' &&
      previous !== null &&
      typeof value === 'object' &&
      value !== null
        ? mergeCatalogs(previous, value)
        : value;
  }
  return Object.freeze(result);
}
