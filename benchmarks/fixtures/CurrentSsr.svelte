<script lang="ts">
  import { provideI18n } from '../../packages/precompile-intl-runtime/src/index.js';
  import { currentSsrMessages } from './catalogs.js';

  let { locale = 'en-US' }: { locale?: string } = $props();
  const i18n = provideI18n(() => ({
    locale,
    fallbackLocale: 'en',
    messages: currentSsrMessages,
    warnOnMissingMessages: false,
  }));
</script>

{#each Array.from({ length: 25 }) as _, index}
  <p>{i18n('greeting', { name: index })}: {i18n('items', { count: index })}</p>
{/each}
