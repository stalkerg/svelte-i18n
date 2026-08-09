# Svelte 5 refactoring plan

Status: `1.0.0-alpha.1` callable API; stable `1.0.0` awaits alpha feedback
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

<h1>{i18n('welcome', { name: 'Alex' })}</h1>
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
  every translation call.
- Do not keep request instances in a process-wide map.
- Do not use `AsyncLocalStorage` for normal translation calls.

Performance budgets:

- less than 2% loss in end-to-end warm SSR throughput;
- less than 5% loss in the isolated 1,000-message formatting benchmark;
- no duplicate locale import for concurrent requests;
- no retained request instance after its component tree is released.

The reproducible measurements and current results are recorded in
[Performance benchmarks](benchmarks.md). The representative runtime mix is 22%
faster than the historical build, warm SSR is 27% faster, concurrent locale
imports remain deduplicated, and the memory harness found no measurable
request-instance retention after release.

## Milestones

### M1 — Monorepo baseline

- [x] Use one root lockfile and workspace dependency graph.
- [x] Remove committed tarballs, build output, backups, and nested lockfiles.
- [x] Add shared TypeScript, Vitest, formatting, and CI configuration.
- [x] Port all existing tests to the shared test runner.
- [x] Capture the historical bundle-size and formatting baseline.

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
- [x] Benchmark the new generated output after minification and compression.

Exit criteria: compiler output contains no dependency on global locale state.

### M4 — Native Svelte 5 state

- [x] Implement `I18n` in a `.svelte.ts` module.
- [x] Use `$state.raw` for immutable catalog references and overlays.
- [x] Add `createI18n`, `provideI18n`, `useI18n`, and `hasI18n`.
- [x] Expose the instance as a callable function with `.t` as a compatible
      alias, without a `Proxy` or store subscription.
- [x] Make locale transitions explicit through an async `setLocale` method.
- [x] Protect locale loading from stale async completion.
- [x] Move `<html lang>` synchronization into an optional browser-side effect.

Exit criteria: the primary entry point contains no Svelte stores or global
mutable i18n state.

### M5 — Vite and SvelteKit integration

- [x] Generate typed `availableLocales`, eager catalogs, and lazy loaders.
- [x] Support request-scoped eager catalogs for SSR.
- [x] Define and test the lazy SSR/hydration strategy separately.
- [x] Add parallel SSR tests with different locales and artificial delays.
- [x] Add a current production SvelteKit build fixture. Do not add Storybook:
      the package has no visual components, and Storybook would duplicate a
      client-only build path without exercising request-scoped SSR.

Exit criteria: concurrent SSR responses never contain another request's
locale, and hydration output matches server output.

### M6 — Compatibility and release

- [x] Do not ship a `/legacy` store adapter; see compatibility decisions below.
- [x] Generate locale, message-key, and ICU value types.
- [x] Validate packed artifacts in a clean Vite/Svelte 5 consumer project.
- [x] Run bundle and SSR benchmarks against the baseline.
- [x] Finish the migration guide.
- [x] Document and automate the release checklist.
- [x] Execute the publication section of the checklist for `1.0.0-alpha.0`.
- [x] Publish the first public alpha with Svelte `^5` as a peer dependency.
- [ ] Promote the tested prerelease to stable `1.0.0` after alpha feedback.

## Compatibility decisions

### No `/legacy` adapter

The first release will not include a store-based compatibility entry point.
The old stores depend on a process-wide mutable singleton, which is precisely
the request-isolation failure the new architecture removes. An adapter that
kept those semantics would make unsafe SvelteKit code appear migrated; an
adapter that required an `I18n` instance would not provide drop-in
compatibility anyway. Omitting it also keeps the public surface and bundle
smaller. Applications can use a temporary project-local wrapper while
migrating components, but the library will expose only the instance API.

### No Storybook fixture

This library exposes state, compiler, and Vite integration rather than visual
components. Its production SvelteKit fixture covers SSR, hydration, client
navigation, lazy imports, generated types, and browser effects. A Storybook
fixture would add a second framework toolchain but would not cover the most
important failure mode: concurrent request isolation. It is therefore not a
release requirement.

## Pull request sequence

1. Monorepo cleanup and shared toolchain.
2. Green baseline tests and benchmarks.
3. Pure runtime with explicit context.
4. Compiler contract v2.
5. Svelte 5 `I18n` state core and callable facade.
6. Request-scoped context and provider API.
7. Locale loader and Vite virtual-module rewrite.
8. SvelteKit SSR, hydration, and concurrency fixtures.
9. Compatibility decisions and optional browser integration.
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
