# @stalkerg/svelte-icu

Native Svelte 5 internationalization with ICU messages compiled at build time.
This is the autonomous, request-safe continuation of
`svelte-intl-precompile`.

> The Svelte 5 API is currently an unreleased alpha.

## Why precompile messages?

Locale files contain normal ICU messages, but the Vite plugin converts dynamic
messages to small JavaScript functions during the build. Applications do not
ship an ICU parser and unused runtime helpers can be tree-shaken.

Compiled functions receive `(context, values)`. Locale and format data are
explicit rather than process-wide, so separate SvelteKit requests cannot
change each other's language.

## Install

```sh
npm install @stalkerg/svelte-icu
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
- typed `i18n.t()`, locale transitions, `availableLocales`, `catalogs`, and
  `loaders`.

```ts
import type { Locale, MessageKey, MessageValuesFor } from '$locales';

const locale: Locale = 'en';
const key: MessageKey = 'cats';
const values: MessageValuesFor<'cats'> = { count: 2 };

i18n.t(key, values);
i18n.t('hello', { name: 'Alex' });
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

Use the instance from context once per component:

```svelte
<script lang="ts">
  import { useI18n } from '@stalkerg/svelte-icu';
  const i18n = useI18n();
</script>

<h1>{i18n.t('hello', { name: 'Alex' })}</h1>
<button onclick={() => i18n.setLocale('ja')}>日本語</button>
```

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

The original project histories and licenses are preserved in the monorepo.
