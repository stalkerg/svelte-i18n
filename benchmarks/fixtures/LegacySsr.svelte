<script>
  import {
    __plural,
    addMessages,
    init,
    t,
  } from '../../.benchmark-cache/baseline/packages/precompile-intl-runtime/dist/modules/index.js';

  init({ initialLocale: 'en-US', fallbackLocale: 'en', warnOnMissingMessages: false });
  addMessages('en', {
    greeting: (name) => `Hello ${name}`,
    items: (count) => __plural(count, { o: 'one item', h: 'many items' }),
  });
</script>

{#each Array.from({ length: 25 }) as _, index}
  <p>{$t('greeting', { values: { name: index } })}: {$t('items', { values: { count: index } })}</p>
{/each}
