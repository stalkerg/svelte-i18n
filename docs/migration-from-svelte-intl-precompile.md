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

export const load = ({ request }) => ({
  locale:
    getLocaleFromAcceptLanguageHeader(request.headers.get('accept-language'), ['en', 'ja']) ?? 'en',
});
```

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

The first major release will document eager SSR as the guaranteed path. Lazy
SSR will only be documented as stable after its hydration behavior is covered
by integration tests.

### Lazy client-side loading

Select lazy output in Vite:

```ts
precompileIntl({ locales: 'locales', mode: 'lazy' });
```

The virtual module then exposes `loaders` instead of populated `catalogs`:

```svelte
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-icu';
  import en from '$locales/en';
  import { loaders } from '$locales';

  let { data, children } = $props();
  const i18n = provideI18n(() => ({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
    loaders
  }));

  $effect(() => {
    void i18n.setLocale(data.locale);
  });
</script>

{@render children()}
```

Keep the fallback locale eager. Until lazy SSR hydration tests are complete,
use eager mode when the first server response must be rendered in the requested
locale.

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
  Set it explicitly in application code while the optional provider effect is
  still pending.
- `registerAll()` is removed. `$locales` now exports `availableLocales`,
  `catalogs`, and `loaders`.
- Svelte 3 and Svelte 4 support is not part of the new primary API.

## Migration checklist

- [ ] Upgrade the application to Svelte 5 and runes syntax.
- [ ] Move the i18n plugin to `vite.config.ts`.
- [ ] Replace global `init` with `provideI18n` in the root layout.
- [ ] Replace store imports with one `useI18n()` call per component.
- [ ] Replace `$t(...)` with `i18n.t(...)`.
- [ ] Replace `$locale = value` with `i18n.setLocale(value)`.
- [ ] Move custom formats and runtime messages to the instance.
- [ ] Ensure SvelteKit `load` returns data and does not mutate i18n state.
- [ ] Add a provider to component tests.
- [ ] Test SSR output and hydration for every supported locale.
