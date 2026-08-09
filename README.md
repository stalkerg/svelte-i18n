# svelte-i18n

Independent monorepo continuation of the `svelte-intl-precompile` project and
its two companion packages. The original repositories are consolidated here so
Svelte 5 support, dependency upgrades, and cross-package changes can be
developed and released as one project.

## Packages

| Workspace | Package | Original repository |
| --- | --- | --- |
| `packages/svelte-intl-precompile` | `svelte-intl-precompile` | [cibernox/svelte-intl-precompile](https://github.com/cibernox/svelte-intl-precompile) |
| `packages/babel-plugin-precompile-intl` | `babel-plugin-precompile-intl` | [cibernox/babel-plugin-precompile-intl](https://github.com/cibernox/babel-plugin-precompile-intl) |
| `packages/precompile-intl-runtime` | `precompile-intl-runtime` | [cibernox/precompile-intl-runtime](https://github.com/cibernox/precompile-intl-runtime) |

Each original default branch was imported as an unsquashed Git subtree, so its
commit history remains available in this repository. This is a one-time history
import rather than an ongoing upstream relationship. The original package
licensing metadata and license files remain in their respective workspaces.

## Goals

- Add native Svelte 5 support.
- Replace the global runtime design where necessary for safe SvelteKit SSR.
- Upgrade the build, test, and dependency toolchain.
- Keep compiler, runtime, and framework integration changes atomic.

## Project documents

- [Svelte 5 refactoring plan](docs/svelte5-refactoring-plan.md)
- [Migration guide from `svelte-intl-precompile`](docs/migration-from-svelte-intl-precompile.md)
