<script lang="ts">
  import { provideI18n, syncDocumentLanguage } from '@stalkerg/svelte-icu';
  import { loaders } from '$locales';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  const i18n = provideI18n(() => ({
    locale: data.locale,
    fallbackLocale: 'en',
    messages: { [data.locale]: data.catalog },
    loaders,
  }));
  syncDocumentLanguage(i18n);

  $effect(() => {
    i18n.setMessages(data.locale, data.catalog);
    void i18n.setLocale(data.locale);
  });
</script>

{@render children()}
