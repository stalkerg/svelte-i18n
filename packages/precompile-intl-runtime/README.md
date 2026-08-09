# @stalkerg/precompile-intl-runtime

Internal Svelte 5 runtime used by `@stalkerg/svelte-icu` and the precompiled
ICU message functions.

The runtime has two layers:

- pure TypeScript lookup, locale fallback, loaders, and cached `Intl` helpers;
- an instance-based `I18n` state core implemented in a `.svelte.ts` module and
  exposed through a callable function facade.

There is no mutable module-level locale, dictionary, or loading store. An
`I18n` instance owns the mutable data for one component tree/request, while
immutable loader results and `Intl` formatter caches may safely be shared.

An instance translates directly with `i18n('key', values)`. The small facade is
not a `Proxy`; it delegates to private rune state. The temporary `i18n.t` alias
from the first two alphas was removed instead of maintaining two spellings for
the same operation.

`syncDocumentLanguage(i18n)` is an optional, tree-shakeable Svelte effect that
keeps the browser's `<html lang>` attribute synchronized with an instance. It
does not run during SSR and is never enabled merely by importing the package.

Most users should install and import `@stalkerg/svelte-icu` instead of this
package directly. See the
[migration guide](https://github.com/stalkerg/svelte-icu/blob/main/docs/migration-from-svelte-intl-precompile.md).
