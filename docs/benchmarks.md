# Performance benchmarks

This document records the release-stabilization benchmark methodology and the
first measured result for the Svelte 5 runtime. It is not a claim that every
application will see the same ratios. The committed benchmark sources are the
source of truth; timing JSON is deliberately ignored because it is
machine-specific.

## Baseline and reproducibility

The legacy side is not a handwritten approximation. `npm run bench:prepare`
extracts the built runtime at commit `3d809a0`, the last monorepo commit before
the Svelte 5 implementation began. This keeps the historical Svelte store,
lookup, formatter, and generated-message contracts intact.

```sh
# Requires the baseline commit to be present in the local Git history.
npm run bench

# Or run a category independently.
npm run bench:runtime
npm run bench:ssr
npm run bench:memory
npm run bench:size
```

Set `SVELTE_ICU_BASELINE_COMMIT` to compare against another historical commit.
Generated artifacts and JSON reports are written to `.benchmark-cache/` and
`.benchmark-results/`.

The snapshot below was recorded on 2026-08-09 with:

- Node.js 26.3.0;
- Linux x64, kernel 7.1.6;
- AMD Ryzen 9 5900X, 12 cores/24 threads;
- Vitest 4.1.10/Tinybench;
- production SvelteKit builds for size comparisons.

Each timing task runs for 500 ms after warmup. Ratios are more useful than raw
operations per second, and small changes should be measured several times on
the same idle machine before drawing conclusions.

## Runtime results

Each operation in the first table formats 1,000 messages. Higher is better.

| Scenario               | Legacy samples/s | Svelte 5 samples/s | Change       |
| ---------------------- | ---------------: | -----------------: | ------------ |
| Cached plain message   |           97,954 |            145,521 | +49%         |
| Interpolation          |           17,065 |             59,261 | 3.47x faster |
| Cardinal plural        |            2,675 |              2,593 | -3.1%        |
| Representative mix[^1] |            1,858 |              2,275 | +22%         |

[^1]:
    Equal parts plain messages, interpolation, cardinal plurals, numbers,
    and dates.

The isolated Intl tasks format 100 values per operation:

| Scenario | Legacy samples/s | Svelte 5 samples/s | Change |
| -------- | ---------------: | -----------------: | ------ |
| Number   |           12,207 |             14,499 | +19%   |
| Date     |            8,706 |             11,002 | +26%   |

The first implementation repeatedly walked locale fallback chains and
serialized named Intl options on every call. The measured hot paths now use:

- an instance-local message lookup cache, invalidated by `addMessages` and
  `setMessages`;
- a direct cache for the active locale instead of a locale map lookup on every
  translation call;
- a cached active `MessageContext`;
- shared default format objects and format-object-scoped named formatter
  caches;
- separate cardinal and ordinal plural-rule caches.

The callable facade was also benchmarked interleaved with the exact
`v1.0.0-alpha.0` source. Direct cached lookup was 3.3% slower, the
representative translation mix was 1.3% faster, and full SSR was 1.2% slower.
Creating an instance added about 0.39 microseconds. These absolute costs keep
the ergonomic API inside the original runtime and SSR performance budgets.

These caches contain only immutable catalogs, messages, contexts, and Intl
objects. They do not keep an `I18n` request instance in process-wide state.

## SSR results

The fixture renders 25 rows with an interpolation and plural in each row: 50
translations per render. The legacy component uses its real global Svelte
stores; the new component creates a request-scoped rune instance. Higher is
better.

| Scenario                  | Legacy renders/s | Svelte 5 renders/s | Change |
| ------------------------- | ---------------: | -----------------: | ------ |
| One warm SSR render       |           24,931 |             31,547 | +27%   |
| Batches of 20 SSR renders |            1,353 |              1,502 | +11%   |

This benchmark is sequential so that both versions produce comparable work.
It does not make the legacy global store safe for concurrent requests. Locale
isolation remains covered separately by the parallel production SvelteKit
tests.

## Memory

The memory harness holds 25,000 instances, forces V8 garbage collection, and
reports the retained heap delta while the instances are reachable.

| Instance state          | Approximate retained heap |
| ----------------------- | ------------------------: |
| New, no translations    |               1,473 bytes |
| After 20 translated IDs |               2,145 bytes |

After releasing the arrays, heap usage returned to within 15 KB of the
pre-allocation value for all 25,000 instances. That difference is below the
noise floor of this harness and shows no measurable process-wide retention.
Run this benchmark with `node --expose-gc`; the root script does this
automatically.

The callable facade retains about 136 additional bytes per instance compared
with alpha.0. It uses one closure and a private state reference; methods and
getters remain shared on its prototype, and no `Proxy` or global instance map
is allocated.

## Generated output and runtime size

Runtime bundles include the public APIs used by a normal app and all compiler
helpers. Svelte itself is external in both measurements so the table measures
library code rather than charging either implementation for the framework.

| Artifact                          | Legacy | Svelte 5 | Delta               |
| --------------------------------- | -----: | -------: | ------------------- |
| Runtime, minified                 |  7,214 |   12,153 | +4,939 bytes        |
| Runtime, minified + gzip          |  2,375 |    3,600 | +1,225 bytes (+52%) |
| 13 generated catalogs, raw        |  7,162 |    8,591 | +1,429 bytes        |
| 13 generated catalogs, minified   |  5,097 |    5,777 | +680 bytes          |
| 13 generated catalogs, min + gzip |  1,481 |    1,605 | +124 bytes (+8%)    |

The runtime increase buys request scope, Svelte 5 reactivity, context APIs,
stale-transition protection, instance-local overlays, and deduplicated async
loaders. The generated-catalog increase comes from passing explicit context
and named values instead of reading global state and relying on sorted
positional arguments.

Relative to alpha.0, the callable facade adds 1,382 minified bytes or 335 gzip
bytes. `i18n.t` is an alias of the callable function rather than a second
translation implementation.

The eager/lazy size fixture intentionally contains only two very small
messages per locale. In that fixture lazy mode adds about 530 gzip bytes to the
static root-layout graph and 431 gzip bytes for the selected English chunk;
dynamic-import overhead is larger than the catalog being deferred. Therefore
lazy mode should be selected to reduce a real application's large catalog
payload, not assumed to be smaller for tiny catalogs. Eager remains the best
default for small locale sets.

## Rules for future changes

- Do not assert wall-clock thresholds in CI; shared runners are too noisy.
- Keep benchmark behavior identical on both sides and return computed values
  so work cannot be optimized away.
- Run correctness tests before interpreting performance results.
- Record regressions together with their absolute cost. A percentage on a
  sub-microsecond operation can be misleading.
- Re-run runtime, SSR, memory, and size categories before publishing a release.
