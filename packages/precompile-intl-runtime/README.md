# @stalkerg/precompile-intl-runtime

Internal Svelte 5 runtime used by `@stalkerg/svelte-icu` and the precompiled
ICU message functions.

The runtime has two layers:

- pure TypeScript lookup, locale fallback, loaders, and cached `Intl` helpers;
- an instance-based `I18n` class implemented in a `.svelte.ts` module with
  Svelte 5 state and component context integration.

There is no mutable module-level locale, dictionary, or loading store. An
`I18n` instance owns the mutable data for one component tree/request, while
immutable loader results and `Intl` formatter caches may safely be shared.

Most users should install and import `@stalkerg/svelte-icu` instead of this
package directly. See the
[migration guide](https://github.com/stalkerg/svelte-icu/blob/main/docs/migration-from-svelte-intl-precompile.md).
