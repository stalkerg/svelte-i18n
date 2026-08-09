# Migrating from `svelte-intl-precompile`

> [!IMPORTANT]
> This is a living migration guide for an unreleased refactor. Code examples
> describe the target API and will be validated against a packed release before
> the first major version is published.

The new library keeps build-time ICU compilation but replaces global Svelte
stores with a request-scoped Svelte 5 `I18n` instance.

## Migration summary

| Old API | New API |
| --- | --- |
| `init(options)` | `createI18n(options)` or `provideI18n(options)` |
| `{$t('key')}` | `{i18n.t('key')}` |
| `{$t('key', { values })}` | `{i18n.t('key', values)}` |
| `$locale = 'ja'` | `await i18n.setLocale('ja')` |
| `addMessages(locale, messages)` | `i18n.addMessages(locale, messages)` |
| `register(locale, loader)` | configure `loaders` on the instance |
| `waitLocale(locale)` | `await i18n.loadLocale(locale)` |
| `$date(value)` | `i18n.formatDate(value)` |
| `$time(value)` | `i18n.formatTime(value)` |
| `$number(value)` | `i18n.formatNumber(value)` |
| global `dictionary` store | `i18n.catalogs`/instance methods |
| global `isLoading` store | `i18n.isLoading` |

## 1. Requirements

The new primary API targets Svelte 5 and runes mode. Svelte 3 and Svelte 4 are
not supported by the primary entry point.

The final install command will use the published package name. The working name
is:

```sh
npm install @stalkerg/svelte-i18n
```

## 2. Vite configuration

The Vite plugin remains a build plugin, but configuration belongs in
`vite.config.ts`, not the obsolete `kit.vite` section of `svelte.config.js`.

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import precompileIntl from '@stalkerg/svelte-i18n/vite';

export default defineConfig({
  plugins: [
    precompileIntl({ locales: 'locales' }),
    sveltekit()
  ]
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
  import { provideI18n } from '@stalkerg/svelte-i18n';
  import { catalogs } from '$locales';

  let { data, children } = $props();

  const i18n = provideI18n({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: catalogs
  });
</script>

{@render children()}
```

Unlike the old `init`, `provideI18n` creates state owned by this component tree.
It does not modify a process-wide locale during SSR.

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
  import { useI18n } from '@stalkerg/svelte-i18n';

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
import { getLocaleFromAcceptLanguageHeader } from '@stalkerg/svelte-i18n';

export const load = ({ request }) => ({
  locale: getLocaleFromAcceptLanguageHeader(
    request.headers.get('accept-language'),
    ['en', 'ja']
  ) ?? 'en'
});
```

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-i18n';
  import { catalogs } from '$locales';

  let { data, children } = $props();

  const i18n = provideI18n({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: catalogs
  });
</script>

{@render children()}
```

The first major release will document eager SSR as the guaranteed path. Lazy
SSR will only be documented as stable after its hydration behavior is covered
by integration tests.

## 7. Custom formats

Custom formats move from global `init` options to the instance:

```ts
const i18n = provideI18n({
  locale: data.locale,
  fallbackLocale: 'en',
  messages: catalogs,
  formats: {
    number: {
      eur: { style: 'currency', currency: 'EUR' }
    },
    date: {
      compact: { year: 'numeric', month: 'short', day: 'numeric' }
    }
  }
});
```

```svelte
{i18n.formatNumber(123, { format: 'eur' })}
{i18n.formatDate(date, { format: 'compact' })}
```

## 8. Testing components

Components that call `useI18n()` must be rendered under an i18n context. A test
helper/provider will be exported for this purpose:

```ts
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: testMessages }
});

renderWithI18n(MyComponent, { i18n });
```

The exact helper name will be finalized with the component-test fixture.

## 9. Removed and intentionally changed behavior

- Primary exports are no longer Svelte stores and no longer use `$` auto-
  subscription syntax.
- There is no global mutable locale or dictionary.
- `init()` no longer configures a process-wide singleton.
- Translation values are passed as an object rather than sorted positional
  function arguments.
- `<html lang>` synchronization is an explicit provider option rather than an
  unconditional module side effect.
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
