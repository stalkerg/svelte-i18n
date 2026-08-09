# Svelte 5 refactoring plan

Status: active (M2–M4 implemented; integration and release hardening continue)
Target: first major release of the autonomous monorepo fork

## Why this is an architectural migration

Replacing `writable` with a module-level `$state` would preserve the current
server-side rendering bug: mutable module state is shared by every request in a
long-lived server process. The new runtime must therefore be instance-based.
Every SSR component tree owns an `I18n` instance provided through Svelte
context. Large immutable catalogs and formatter caches may still be shared
across instances.

The target data model is:

```text
process-wide immutable data
  compiled catalogs
  locale loader definitions
  Intl formatter and plural-rule caches

component-tree/request-scoped mutable data
  current locale
  fallback locale and formats
  catalog overlays
  loading and error state
```

## Target API

```svelte
<script lang="ts">
  import { provideI18n } from '@stalkerg/svelte-icu';

  let { data, children } = $props();

  const i18n = provideI18n({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: data.messages
  });
</script>

{@render children()}
```

```svelte
<script lang="ts">
  import { useI18n } from '@stalkerg/svelte-icu';

  const i18n = useI18n();
</script>

<h1>{i18n.t('welcome', { name: 'Alex' })}</h1>
<button onclick={() => i18n.setLocale('ja')}>Japanese</button>
```

The public package name is `@stalkerg/svelte-icu`.

## Runtime contract

The runtime is split into two layers:

1. A pure TypeScript layer for lookup, locale fallback, loaders, and `Intl`
   formatting. It must not import `svelte/store` or depend on mutable module
   state.
2. A Svelte 5 layer in `.svelte.ts` modules. It owns request-scoped `$state`,
   `$state.raw`, `$derived`, and context integration.

Compiled messages receive all mutable inputs explicitly:

```ts
export type MessageFunction = (context: MessageContext, values: MessageValues) => string;
```

No compiled helper may read a global current locale or global format options.

## Performance rules

- Never clone the base catalogs per request.
- Store catalog references in `$state.raw`; use a small per-instance overlay for
  runtime additions.
- Cache `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules`
  process-wide using keys that include locale and options.
- Resolve Svelte context once during component initialization, never inside
  every `t()` call.
- Do not keep request instances in a process-wide map.
- Do not use `AsyncLocalStorage` for normal translation calls.

Performance budgets:

- less than 2% loss in end-to-end warm SSR throughput;
- less than 5% loss in the isolated 1,000-message formatting benchmark;
- no duplicate locale import for concurrent requests;
- no retained request instance after its component tree is released.

## Milestones

### M1 — Monorepo baseline

- [x] Use one root lockfile and workspace dependency graph.
- [x] Remove committed tarballs, build output, backups, and nested lockfiles.
- [x] Add shared TypeScript, Vitest, formatting, and CI configuration.
- [x] Port all existing tests to the shared test runner.
- [ ] Capture bundle-size and formatting benchmarks before changing behavior.

Exit criteria: one install, build, check, and test command succeeds from root.

### M2 — Pure runtime

- [x] Introduce immutable runtime options and explicit `MessageContext`.
- [x] Make dictionary lookup accept catalogs and locale explicitly.
- [x] Make number/date/time helpers accept explicit context.
- [x] Replace global loader queues with an instance-safe loader registry/cache.
- [x] Preserve process-wide immutable formatter caches.
- [x] Add tests proving two runtime instances cannot affect each other.

Exit criteria: formatting and lookup tests run without `svelte/store`.

### M3 — Compiler contract v2

- [x] Generate `(context, values) => string` message functions.
- [x] Remove alphabetical positional-argument coupling.
- [x] Pass locale and formats explicitly to all generated helpers.
- [x] Update compiler snapshots and integration plugin tests.
- [x] Add correct ordinal plural handling.
- [ ] Benchmark the new generated output after minification and compression.

Exit criteria: compiler output contains no dependency on global locale state.

### M4 — Native Svelte 5 state

- [x] Implement `I18n` in a `.svelte.ts` module.
- [x] Use `$state.raw` for immutable catalog references and overlays.
- [x] Add `createI18n`, `provideI18n`, `useI18n`, and `hasI18n`.
- [x] Make locale transitions explicit through an async `setLocale` method.
- [x] Protect locale loading from stale async completion.
- [ ] Move `<html lang>` synchronization into an optional browser-side effect.

Exit criteria: the primary entry point contains no Svelte stores or global
mutable i18n state.

### M5 — Vite and SvelteKit integration

- [x] Generate typed `availableLocales`, eager catalogs, and lazy loaders.
- [x] Support request-scoped eager catalogs for SSR.
- [ ] Define and test the lazy SSR/hydration strategy separately.
- [ ] Add parallel SSR tests with different locales and artificial delays.
      (Parallel component-tree isolation is covered; async SSR delays remain.)
- [ ] Add a current SvelteKit example and Storybook production-build fixture.

Exit criteria: concurrent SSR responses never contain another request's
locale, and hydration output matches server output.

### M6 — Compatibility and release

- [ ] Decide whether a tree-shakeable `/legacy` store adapter is worth keeping.
- [ ] Generate locale and message-key types.
- [x] Validate packed artifacts in a clean Vite/Svelte 5 consumer project.
- [ ] Run bundle and SSR benchmarks against the baseline.
- [ ] Finish the migration guide and release checklist.
- [ ] Publish the first major version with Svelte `^5` as a peer dependency.

## Pull request sequence

1. Monorepo cleanup and shared toolchain.
2. Green baseline tests and benchmarks.
3. Pure runtime with explicit context.
4. Compiler contract v2.
5. Svelte 5 `I18n` state class.
6. Request-scoped context and provider API.
7. Locale loader and Vite virtual-module rewrite.
8. SvelteKit SSR, hydration, and concurrency fixtures.
9. Optional legacy adapter.
10. Documentation, migration guide, package validation, and release.

## Definition of done

- The primary runtime does not import `svelte/store`.
- There is no module-level mutable locale, dictionary, options, or loading state.
- `I18n` is request scoped during SSR and reactive in the browser.
- Compiled functions receive context and values explicitly.
- Concurrent SSR and hydration tests pass for several locales.
- A packed release installs with exactly one compatible Svelte 5 runtime.
- The migration guide covers installation, configuration, components, locale
  switching, lazy loading, SSR, formatting, testing, and removed APIs.
