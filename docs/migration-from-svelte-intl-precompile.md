# Migrating from `svelte-intl-precompile`

> [!IMPORTANT]
> This is a living migration guide for an unreleased alpha. The API examples
> below match the implementation and have been validated with packed packages
> in a clean Svelte 5/Vite consumer.

The new library keeps build-time ICU compilation but replaces global Svelte
stores with a request-scoped Svelte 5 `I18n` instance.

## Migration summary

| Old API                         | New API                                         |
| ------------------------------- | ----------------------------------------------- |
| `init(options)`                 | `createI18n(options)` or `provideI18n(options)` |
| `{$t('key')}`                   | `{i18n.t('key')}`                               |
| `{$t('key', { values })}`       | `{i18n.t('key', values)}`                       |
| `$locale = 'ja'`                | `await i18n.setLocale('ja')`                    |
| `addMessages(locale, messages)` | `i18n.addMessages(locale, messages)`            |
| `register(locale, loader)`      | configure `loaders` on the instance             |
| `waitLocale(locale)`            | `await i18n.loadLocale(locale)`                 |
| `$date(value)`                  | `i18n.formatDate(value)`                        |
| `$time(value)`                  | `i18n.formatTime(value)`                        |
| `$number(value)`                | `i18n.formatNumber(value)`                      |
| global `dictionary` store       | `i18n.catalogs`/instance methods                |
| global `isLoading` store        | `i18n.isLoading`                                |

## 1. Requirements

The new primary API targets Svelte 5 and runes mode. Svelte 3 and Svelte 4 are
not supported by the primary entry point.

```sh
npm install @stalkerg/svelte-icu
```

## 2. Vite configuration

The Vite plugin remains a build plugin, but configuration belongs in
`vite.config.ts`, not the obsolete `kit.vite` section of `svelte.config.js`.

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import precompileIntl from '@stalkerg/svelte-icu/vite';

export default defineConfig({
  plugins: [precompileIntl({ locales: 'locales', mode: 'eager' }), sveltekit()],
});
```

## 3. Root layout initialization

### Before

```svelte
<script>
  import { init, addMessages } from 'svelte-intl-precompile';
  import en from '$locales/en';
  import ja from '$locales/ja';

  addMessages('en', en);
  addMessages('ja', ja);

  init({
    initialLocale: 'en',
    fallbackLocale: 'en'
  });
</script>

<slot />
```

### After

```svelte
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

Unlike the old `init`, `provideI18n` creates state owned by this component tree.
It does not modify a process-wide locale during SSR. The callback form reads
the initial props without Svelte's `state_referenced_locally` warning. The
effect keeps the instance in sync if SvelteKit later replaces `data` during
client-side navigation.

### Optional `<html lang>` synchronization

The old library changed the document language as a global side effect. The new
runtime makes that behavior explicit and instance-scoped:

```svelte
<script lang="ts">
  import { provideI18n, syncDocumentLanguage } from '@stalkerg/svelte-icu';
  import { catalogs } from '$locales';

  let { data } = $props();
  const i18n = provideI18n(() => ({
    locale: data.locale,
    messages: catalogs,
  }));
  syncDocumentLanguage(i18n);
</script>
```

Call `syncDocumentLanguage` during component initialization. It registers a
Svelte effect, follows `i18n.locale`, and is tree-shaken when unused. The effect
does not execute during SSR, so continue to render an initial language in
`src/app.html` or with a SvelteKit server hook. Applications whose locale IDs
are not BCP 47 tags can map them explicitly:

```ts
syncDocumentLanguage(i18n, {
  map: (locale) => locale.replace('_', '-'),
});
```

### Generated types

The Vite plugin generates `src/svelte-icu.d.ts` from all locale files. Commit
the generated declaration so `svelte-check` and editors can use it before a
Vite dev server starts. It provides `Locale`, `MessageKey`, and
`MessageValuesFor<Key>` and narrows `i18n.t()` automatically:

```ts
import type { Locale, MessageKey, MessageValuesFor } from '$locales';

const locale: Locale = 'en';
const key: MessageKey = 'welcome';
const values: MessageValuesFor<'welcome'> = { name: 'Alex' };

i18n.t(key, values);
```

After adding or removing locale messages, start Vite or run a production build
and commit the updated declaration. The default path can be changed with the
plugin's `types` option or generation can be disabled with `types: false`.

## 4. Translating in components

### Before

```svelte
<script>
  import { t } from 'svelte-intl-precompile';
</script>

<h1>{$t('welcome', { values: { name: 'Alex' } })}</h1>
```

### After

```svelte
<script lang="ts">
  import { useI18n } from '@stalkerg/svelte-icu';

  const i18n = useI18n();
</script>

<h1>{i18n.t('welcome', { name: 'Alex' })}</h1>
```

Call `useI18n()` once during component initialization. Do not call it from
event handlers or from `i18n.t()` wrappers created after initialization.

## 5. Changing locale

### Before

```svelte
<button on:click={() => ($locale = 'ja')}>Japanese</button>
```

### After

```svelte
<button onclick={() => i18n.setLocale('ja')}>Japanese</button>
```

`setLocale` is asynchronous when the locale uses a lazy loader:

```ts
await i18n.setLocale('ja');
```

The instance ignores stale loader completion if the user selects another locale
before the first locale finishes loading.

## 6. SvelteKit SSR

Do not mutate i18n state in a module-level variable or in a `load` function.
Return serializable locale information from `load`, then create the instance in
the root layout.

```ts
// +layout.server.ts
import { getLocaleFromAcceptLanguageHeader } from '@stalkerg/svelte-icu';
import type { Locale } from '$locales';
import type { LayoutServerLoad } from './$types';

const supportedLocales = ['en', 'ja'] as const satisfies readonly Locale[];

export const load = (({ request }) => {
  const locale: Locale =
    getLocaleFromAcceptLanguageHeader(request.headers.get('accept-language'), supportedLocales) ??
    'en';
  return { locale };
}) satisfies LayoutServerLoad;
```

Using `satisfies` preserves the generated locale union in SvelteKit's inferred
layout data. A direct `const load: LayoutServerLoad = ...` annotation may widen
the returned locale to `string`.

```svelte
<!-- +layout.svelte -->
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

Eager mode is the simplest SSR path. The library also supports request-scoped
lazy SSR using a universal SvelteKit load function.

### Lazy SSR and hydration

Select lazy output in Vite:

```ts
precompileIntl({ locales: 'locales', mode: 'lazy' });
```

The virtual module then exposes `loaders` instead of populated `catalogs`.
Keep locale negotiation in `+layout.server.ts`, because the locale string is
serializable. Load the compiled catalog in universal `+layout.ts`:

```ts
// +layout.ts
import { error } from '@sveltejs/kit';
import { loaders } from '$locales';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  const loader = loaders[data.locale];
  if (!loader) error(404, `Unknown locale: ${data.locale}`);

  return {
    locale: data.locale,
    catalog: await loader(),
  };
};
```

A universal load function runs during SSR and again during hydration. It may
return compiled functions, unlike `+layout.server.ts`, whose output must be
serializable. This lets the server and browser import the same locale chunk
before rendering their respective component trees.

Install the resolved catalog in the root layout:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-icu';
  import { loaders } from '$locales';

  let { data, children } = $props();
  const i18n = provideI18n(() => ({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: { [data.locale]: data.catalog },
    loaders
  }));

  $effect(() => {
    i18n.setMessages(data.locale, data.catalog);
    void i18n.setLocale(data.locale);
  });
</script>

{@render children()}
```

`setMessages` marks the catalog returned by the universal load as complete, so
`setLocale` does not invoke its lazy loader a second time. The effect also
installs new catalogs during client-side navigation.

Do not return a compiled catalog from `+layout.server.ts`: message functions
cannot be serialized. The production fixture tests initial hydration, lazy
client navigation, and concurrent delayed SSR requests in different locales.

## 7. Custom formats

Custom formats move from global `init` options to the instance:

```ts
const i18n = provideI18n({
  locale: data.locale,
  fallbackLocale: 'en',
  messages: catalogs,
  formats: {
    number: {
      eur: { style: 'currency', currency: 'EUR' },
    },
    date: {
      compact: { year: 'numeric', month: 'short', day: 'numeric' },
    },
  },
});
```

```svelte
{i18n.formatNumber(123, 'eur')}
{i18n.formatDate(date, 'compact')}
```

## 8. Testing components

Components that call `useI18n()` must be rendered under an i18n context. Wrap
them in a small test-only provider component:

```svelte
<!-- TestProvider.svelte -->
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-icu';
  import Child from './ComponentUnderTest.svelte';

  let { messages } = $props();
  provideI18n(() => ({ locale: 'en', messages: { en: messages } }));
</script>

<Child />
```

For pure translation tests, create an isolated instance directly with
`createI18n(options)`; no component context is required.

## 9. Removed and intentionally changed behavior

- Primary exports are no longer Svelte stores and no longer use `$` auto-
  subscription syntax.
- There is no global mutable locale or dictionary.
- `init()` no longer configures a process-wide singleton.
- Translation values are passed as an object rather than sorted positional
  function arguments.
- The library no longer changes `<html lang>` as an unconditional side effect.
  Use the optional `syncDocumentLanguage` effect when desired.
- `registerAll()` is removed. `$locales` now exports `availableLocales`,
  `catalogs`, and `loaders`.
- There is intentionally no `/legacy` store adapter. Keeping global mutable
  stores would preserve the SSR isolation problem this fork fixes.
- Svelte 3 and Svelte 4 support is not part of the new primary API.

## Migration checklist

- [ ] Upgrade the application to Svelte 5 and runes syntax.
- [ ] Move the i18n plugin to `vite.config.ts`.
- [ ] Replace global `init` with `provideI18n` in the root layout.
- [ ] Replace store imports with one `useI18n()` call per component.
- [ ] Replace `$t(...)` with `i18n.t(...)`.
- [ ] Replace `$locale = value` with `i18n.setLocale(value)`.
- [ ] Opt in to `syncDocumentLanguage` or manage `<html lang>` in application
      code.
- [ ] Move custom formats and runtime messages to the instance.
- [ ] Generate and commit `src/svelte-icu.d.ts`.
- [ ] Fix newly reported unknown locale, message key, and ICU value errors.
- [ ] Ensure SvelteKit `load` returns data and does not mutate i18n state.
- [ ] In lazy mode, load compiled catalogs in universal `+layout.ts`, not
      `+layout.server.ts`.
- [ ] Add a provider to component tests.
- [ ] Test SSR output and hydration for every supported locale.
