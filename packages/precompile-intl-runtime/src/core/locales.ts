export function getPossibleLocales(refLocale: string, fallbackLocale = ''): string[] {
  const result = [...getSubLocales(refLocale)];
  if (fallbackLocale) result.push(...getSubLocales(fallbackLocale));
  return [...new Set(result)];
}

function getSubLocales(locale: string): string[] {
  if (!locale) return [];
  return locale
    .split('-')
    .map((_, index, parts) => parts.slice(0, index + 1).join('-'))
    .reverse();
}
