# @stalkerg/babel-plugin-precompile-intl

Babel 8 plugin that compiles ICU messages to functions for
`@stalkerg/svelte-icu`.

```js
import buildPlugin from '@stalkerg/babel-plugin-precompile-intl';

const plugin = buildPlugin();
```

The default helper import is `@stalkerg/precompile-intl-runtime`. Pass a custom
runtime import to `buildPlugin(runtimeImportPath)` when re-exporting helpers
from an umbrella package.

Given:

```js
export default {
  hello: 'Hello {name}',
  cats: '{count, plural, one {One cat} other {# cats}}',
};
```

the plugin emits functions using the v2 contract:

```js
import { __interpolate, __plural } from '@stalkerg/precompile-intl-runtime';

export default {
  hello: (__ctx, __values) => `Hello ${__interpolate(__values['name'])}`,
  cats: (__ctx, __values) =>
    __plural(__ctx, __values['count'], {
      o: 'One cat',
      h: `${__values['count']} cats`,
    }),
};
```

Locale-sensitive helpers always receive context explicitly. Argument names are
read from the values object rather than becoming sorted positional parameters.
This contract is intentionally incompatible with the abandoned upstream
runtime.
