# @stalkerg/svelte-icu

Native Svelte 5 internationalization with ICU messages compiled at build time.
This is the autonomous, request-safe continuation of
`svelte-intl-precompile`.

> The Svelte 5 API is currently available as the `next` prerelease.

## Why precompile messages?

Locale files contain normal ICU messages, but the Vite plugin converts dynamic
messages to small JavaScript functions during the build. Applications do not
ship an ICU parser and unused runtime helpers can be tree-shaken.

Compiled functions receive `(context, values)`. Locale and format data are
explicit rather than process-wide, so separate SvelteKit requests cannot
change each other's language.

## Install

```sh
npm install @stalkerg/svelte-icu@next
```

Svelte `^5.0.0` is required.

## Configure Vite

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import precompileIntl from '@stalkerg/svelte-icu/vite';

export default defineConfig({
  plugins: [precompileIntl({ locales: 'locales', mode: 'eager' }), sveltekit()],
});
```

Create `locales/en.json`, `locales/ja.json`, and so on:

```json
{
  "hello": "Hello {name}",
  "cats": "{count, plural, =0 {No cats} one {One cat} other {# cats}}"
}
```

## Generated TypeScript types

Starting Vite or creating a production build generates
`src/svelte-icu.d.ts`. Commit this file so editors and standalone
`svelte-check` runs have the same types before Vite starts. If Prettier rewrites
generated declarations, add the file to `.prettierignore`.

The declaration derives:

- `Locale` from locale filenames;
- `MessageKey` from flattened catalog keys;
- `MessageValuesFor<Key>` from ICU arguments;
- a typed callable `i18n`, locale transitions, `availableLocales`, `catalogs`,
  and `loaders`.

```ts
import type { Locale, MessageKey, MessageValuesFor } from '$locales';

const locale: Locale = 'en';
const key: MessageKey = 'cats';
const values: MessageValuesFor<'cats'> = { count: 2 };

i18n(key, values);
i18n('hello', { name: 'Alex' });
```

Plural and number arguments are inferred as `number`; date and time arguments
as `Date | number`; interpolation and select arguments as `unknown` while
remaining required. Static messages accept no named values.

The output path is relative to the Vite root and can be changed or disabled:

```ts
precompileIntl({
  locales: 'locales',
  types: 'src/generated/i18n.d.ts', // or false
});
```

When a SvelteKit load function should preserve a generated locale union, prefer
`satisfies` over a contextual variable annotation:

```ts
import type { Locale } from '$locales';
import type { LayoutServerLoad } from './$types';

export const load = (() => {
  const locale: Locale = 'en';
  return { locale };
}) satisfies LayoutServerLoad;
```

## Provide request-scoped state

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-icu';
  import { catalogs } from '$locales';

  let { data, children } = $props();
  const i18n = provideI18n(() => ({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: catalogs
  }));

  $effect(() => {
    void i18n.setLocale(data.locale);
  });
</script>

{@render children()}
```

To keep the browser document language synchronized during locale changes, opt
in from the same layout:

```svelte
<script lang="ts">
  import { syncDocumentLanguage } from '@stalkerg/svelte-icu';

  // Call this after the provideI18n(...) shown above.
  syncDocumentLanguage(i18n);
</script>
```

The effect only runs in the browser. Render the initial `<html lang>` in
`src/app.html` or a SvelteKit server hook so the SSR response is accessible
before hydration. A `map` option can convert application locale identifiers to
BCP 47 values, for example
`syncDocumentLanguage(i18n, { map: (locale) => locale.replace('_', '-') })`.

Use the instance from context once per component:

```svelte
<script lang="ts">
  import { useI18n } from '@stalkerg/svelte-icu';
  const i18n = useI18n();
</script>

<h1>{i18n('hello', { name: 'Alex' })}</h1>
<button onclick={() => i18n.setLocale('ja')}>日本語</button>
```

`i18n.t(...)` remains an identical, bound alias for applications already using
the first alpha, but direct invocation is the canonical API.

## Lazy SSR

With `mode: 'lazy'`, load the requested catalog in universal `+layout.ts` and
pass it to the root layout. Universal load runs once for SSR and again before
hydration, so compiled message functions never cross the serialized server-data
boundary. Call `i18n.setMessages(locale, catalog)` when layout data changes,
then `i18n.setLocale(locale)`.

See the migration guide for the complete eager and lazy SvelteKit examples.

## Documentation

- [Svelte 5 refactoring plan](https://github.com/stalkerg/svelte-icu/blob/main/docs/svelte5-refactoring-plan.md)
- [Migration from `svelte-intl-precompile`](https://github.com/stalkerg/svelte-icu/blob/main/docs/migration-from-svelte-intl-precompile.md)
- [Release checklist](https://github.com/stalkerg/svelte-icu/blob/main/docs/release-checklist.md)

The original project histories and licenses are preserved in the monorepo.
