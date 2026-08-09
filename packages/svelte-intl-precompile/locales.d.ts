declare module '$locales' {
  export type Locale = import('@stalkerg/precompile-intl-runtime').Locale;
  export type MessageKey = import('@stalkerg/precompile-intl-runtime').MessageKey;
  export type MessageValuesFor<Key extends MessageKey> =
    import('@stalkerg/precompile-intl-runtime').MessageValuesFor<Key>;
  export const availableLocales: readonly Locale[];
  export const catalogs: Readonly<
    Partial<Record<Locale, import('@stalkerg/precompile-intl-runtime').Catalog>>
  >;
  export const loaders: Readonly<
    Partial<Record<Locale, () => Promise<import('@stalkerg/precompile-intl-runtime').Catalog>>>
  >;
}
