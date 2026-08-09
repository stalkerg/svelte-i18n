<script lang="ts">
  import { provideI18n, type I18nOptions } from '../../dist/modules/index.js';
  import Child from './Child.svelte';

  let { options, name }: { options: I18nOptions; name: string } = $props();
  provideI18n(() => options);
</script>

<Child {name} />
