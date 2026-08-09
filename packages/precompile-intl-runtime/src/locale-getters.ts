function getFromQueryString(queryString: string, key: string): string | null {
  return new URLSearchParams(queryString).get(key);
}

function getFirstMatch(base: string, pattern: RegExp): string | null {
  return pattern.exec(base)?.[1] ?? null;
}

export function getLocaleFromHostname(hostname: RegExp): string | null {
  if (typeof window === 'undefined') return null;
  return getFirstMatch(window.location.hostname, hostname);
}

export function getLocaleFromPathname(pathname: RegExp): string | null {
  if (typeof window === 'undefined') return null;
  return getFirstMatch(window.location.pathname, pathname);
}

export function getLocaleFromNavigator(ssrDefault?: string): string | null {
  if (typeof window === 'undefined') return ssrDefault ?? null;
  return window.navigator.language || window.navigator.languages[0] || null;
}

export function getLocaleFromQueryString(search: string): string | null {
  if (typeof window === 'undefined') return null;
  return getFromQueryString(window.location.search.slice(1), search);
}

export function getLocaleFromHash(hash: string): string | null {
  if (typeof window === 'undefined') return null;
  return getFromQueryString(window.location.hash.slice(1), hash);
}

export function getLocaleFromAcceptLanguageHeader(
  header: string | null,
  availableLocales?: readonly string[],
): string | undefined {
  if (!header) return undefined;

  const requestedLocales = header
    .split(',')
    .map((entry) => {
      const [locale = '', quality] = entry.trim().split(';q=');
      return { locale, quality: quality === undefined ? 1 : Number.parseFloat(quality) };
    })
    .filter(({ locale, quality }) => locale !== '' && !Number.isNaN(quality) && quality > 0)
    .sort((left, right) => right.quality - left.quality);

  if (!availableLocales || availableLocales.length === 0) {
    return requestedLocales[0]?.locale;
  }

  const availableByLowercase = new Map(
    availableLocales.map((locale) => [locale.toLowerCase(), locale]),
  );

  let firstAvailableBaseMatch: { match: string; base: string } | undefined;
  for (const { locale } of requestedLocales) {
    const normalized = locale.toLowerCase();
    if (
      firstAvailableBaseMatch &&
      normalized !== firstAvailableBaseMatch.base &&
      !normalized.startsWith(`${firstAvailableBaseMatch.base}-`)
    ) {
      continue;
    }
    const fullMatch = availableByLowercase.get(normalized);
    if (fullMatch) return fullMatch;

    if (firstAvailableBaseMatch) continue;

    const requestedBase = normalized.split('-')[0];
    if (!requestedBase) continue;
    const exactBaseMatch = availableByLowercase.get(requestedBase);
    if (exactBaseMatch) return exactBaseMatch;

    const availableBaseMatch = availableLocales.find(
      (available) => available.toLowerCase().split('-')[0] === requestedBase,
    );
    if (availableBaseMatch) {
      firstAvailableBaseMatch = { match: availableBaseMatch, base: requestedBase };
    }
  }
  return firstAvailableBaseMatch?.match;
}
