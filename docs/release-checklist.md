# Release checklist

The three packages form one product and use the same version. The first public
release, `1.0.0-alpha.0`, was published on 2026-08-09. The intended prerelease
channel is the npm `next` dist-tag. npm also initialized `latest` to this first
version because no stable version existed; subsequent prereleases must use
`next`, and stable `1.0.0` will replace `latest`.

The registry release was installed without npm credentials in an empty Vite
project. Its production build, `svelte-check`, dependency deduplication, and
generated locale/message/value types all passed before the Git tag and GitHub
prerelease were created.

## Automated gate

Run from a clean checkout on a supported Node release:

```sh
npm ci
npm run release:check
```

The command verifies formatting, builds all workspaces, runs Vitest and the
production SvelteKit/Chromium fixture, checks the contents and entry points of
all three npm packages, and runs `npm audit`. CI also runs package validation
as an independent job.

`scripts/validate-release.mjs` fails when:

- workspace versions are not synchronized;
- internal dependencies are not pinned to that exact version;
- either Svelte-facing package does not peer-depend on Svelte `^5.0.0`;
- publishing is not public or repository metadata is inconsistent;
- a `workspace:` range remains in a publishable manifest;
- an exported entry point is missing from its tarball; or
- source, tests, lockfiles, or nested tarballs leak into a package.

## Manual pre-publication checks

- [ ] Confirm `git status --short` is empty and CI is green for the release
      commit.
- [ ] Review the generated `src/svelte-icu.d.ts` in the SvelteKit fixture.
- [ ] Run `npm run bench` on the same host used for the recorded baseline and
      update `docs/benchmarks.md` if results materially changed.
- [ ] Verify the migration guide and README examples against the final API.
- [ ] Confirm the changelog describes breaking changes, the lack of a legacy
      store adapter, request-scoped SSR, generated types, and `<html lang>`
      opt-in.
- [ ] Confirm the npm account can publish all three `@stalkerg` package names
      and that two-factor authentication/provenance requirements are met.
- [ ] Inspect `npm pack --dry-run --json ./packages/<workspace>` for each
      workspace if the automated summary has unexpected size changes.

## Versioning

- [ ] Set the same version in all three workspace manifests.
- [ ] Pin both internal dependencies in `@stalkerg/svelte-icu` to that exact
      version; never publish a `workspace:` range.
- [ ] Regenerate `package-lock.json` and rerun `npm run release:check`.
- [ ] Use a prerelease version and `next` until the API is intentionally
      promoted to stable.

## Publication order

Publish dependencies before the public umbrella package:

```sh
npm publish --workspace @stalkerg/babel-plugin-precompile-intl --tag next --access public
npm publish --workspace @stalkerg/precompile-intl-runtime --tag next --access public
npm publish --workspace @stalkerg/svelte-icu --tag next --access public
```

Add `--provenance` when these commands run in a publishing environment that is
configured to produce npm provenance attestations.

- [ ] Verify each command published the intended version and `next` dist-tag
      before continuing to the next package.
- [ ] Do not move `latest` to an alpha package.
- [ ] Create and push the matching `v1.0.0-alpha.0` Git tag only after all
      packages are available.
- [ ] Create a GitHub release linked to the migration guide and benchmarks.

## Post-publication smoke test

- [ ] In an empty directory, install `@stalkerg/svelte-icu@next` with Svelte 5.
- [ ] Build a Vite app using both the main and `/vite` entry points.
- [ ] Confirm the Vite plugin generates locale, key, and ICU value types.
- [ ] Run the production output and verify SSR, hydration, locale navigation,
      and lazy catalog loading.
- [ ] Confirm the install resolves one compatible Svelte runtime and no
      unintended duplicate of either internal package.
- [ ] If a published package is unusable, deprecate that exact version and
      publish a corrected prerelease; never overwrite an npm version.

## Stable `1.0.0`

Promote only after the alpha has been exercised by real applications. Repeat
the complete checklist, publish `1.0.0` without `--tag next`, and then verify
that npm's `latest` dist-tag points to the stable version.
