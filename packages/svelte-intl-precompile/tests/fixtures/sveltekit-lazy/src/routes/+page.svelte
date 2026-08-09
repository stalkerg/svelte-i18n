<script lang="ts">
  import { useI18n } from '@stalkerg/svelte-icu';

  const i18n = useI18n();

  $effect(() => {
    document.body.dataset.hydrated = `${i18n.locale}:${i18n.t('greeting', { name: 'Browser' })}`;
  });
</script>

<h1 id="greeting">{i18n.t('greeting', { name: 'Browser' })}</h1>
<p id="language">{i18n.t('language')}</p>
<nav>
  <a id="english" href="/?locale=en">English</a>
  <a id="japanese" href="/?locale=ja">日本語</a>
</nav>
