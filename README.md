# svelte-i18n

Monorepo fork of the `svelte-intl-precompile` project and its two companion
packages. The upstream repositories are kept together here so Svelte 5 support,
dependency upgrades, and cross-package changes can be developed and released as
one project.

## Packages

| Workspace | Package | Upstream |
| --- | --- | --- |
| `packages/svelte-intl-precompile` | `svelte-intl-precompile` | [cibernox/svelte-intl-precompile](https://github.com/cibernox/svelte-intl-precompile) |
| `packages/babel-plugin-precompile-intl` | `babel-plugin-precompile-intl` | [cibernox/babel-plugin-precompile-intl](https://github.com/cibernox/babel-plugin-precompile-intl) |
| `packages/precompile-intl-runtime` | `precompile-intl-runtime` | [cibernox/precompile-intl-runtime](https://github.com/cibernox/precompile-intl-runtime) |

Each upstream default branch was imported as an unsquashed Git subtree, so its
commit history remains available in this repository. The original package
licenses remain in their respective workspace directories.

## Goals

- Add native Svelte 5 support.
- Replace the global runtime design where necessary for safe SvelteKit SSR.
- Upgrade the build, test, and dependency toolchain.
- Keep compiler, runtime, and framework integration changes atomic.
