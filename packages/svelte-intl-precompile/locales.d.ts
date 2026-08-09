declare module '$locales' {
  export const availableLocales: readonly string[];
  export const catalogs: import('@stalkerg/precompile-intl-runtime').Catalogs;
  export const loaders: Readonly<
    Record<string, import('@stalkerg/precompile-intl-runtime').MessagesLoader>
  >;
}
