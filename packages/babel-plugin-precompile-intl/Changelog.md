# 1.0.0-alpha.0

- Rename the package to `@stalkerg/babel-plugin-precompile-intl` and publish it
  from the autonomous `svelte-icu` monorepo.
- Generate message functions with an explicit `(context, values)` contract
  instead of reading mutable global locale and format state.
- Replace sorted positional values with named ICU value objects.
- Add message analysis used to generate required interpolation, plural,
  select, number, date, and time types.
- Correct ordinal plural handling and update the compiler toolchain.

# 0.5.2
- Fix edge case when two plurals are contiguous with nothing in between.

# 0.4.0
- Support template literals in when translations are defined in javascript files (#17)
# 0.4.0-beta.2
- Initial support for `scale` in number skeletons.
# 0.4.0-beta.1
- Transform to ES Modules.
# 0.4.0-beta.0
- Support number skeletons. Support might not be complete yet.
