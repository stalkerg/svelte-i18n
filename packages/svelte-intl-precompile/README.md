# @stalkerg/svelte-i18n

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
npm install @stalkerg/svelte-i18n
```

Svelte `^5.0.0` is required.

## Configure Vite

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import precompileIntl from '@stalkerg/svelte-i18n/vite';

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

## Provide request-scoped state

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-i18n';
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
  import { useI18n } from '@stalkerg/svelte-i18n';
  const i18n = useI18n();
</script>

<h1>{i18n.t('hello', { name: 'Alex' })}</h1>
<button onclick={() => i18n.setLocale('ja')}>日本語</button>
```

## Documentation

- [Svelte 5 refactoring plan](https://github.com/stalkerg/svelte-i18n/blob/main/docs/svelte5-refactoring-plan.md)
- [Migration from `svelte-intl-precompile`](https://github.com/stalkerg/svelte-i18n/blob/main/docs/migration-from-svelte-intl-precompile.md)

The original project histories and licenses are preserved in the monorepo.
