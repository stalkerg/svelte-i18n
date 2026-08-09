<script lang="ts">
  import { useI18n } from '../../dist/modules/index.js';

  let { name }: { name: string } = $props();
  const i18n = useI18n();
</script>

<p lang={i18n.locale}>{i18n.t('greeting', { name })}</p>
