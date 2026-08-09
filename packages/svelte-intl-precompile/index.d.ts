export * from '@stalkerg/precompile-intl-runtime';

declare module '$locales' {
  import type { Catalogs, LocaleLoaders } from '@stalkerg/precompile-intl-runtime';

  export const availableLocales: readonly string[];
  export const catalogs: Catalogs;
  export const loaders: LocaleLoaders;
}
