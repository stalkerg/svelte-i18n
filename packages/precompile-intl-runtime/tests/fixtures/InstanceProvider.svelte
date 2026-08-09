<script lang="ts">
  import { provideI18n, type I18n } from '../../dist/modules/index.js';
  import Child from './Child.svelte';

  let { i18n, name }: { i18n: I18n; name: string } = $props();
  // svelte-ignore state_referenced_locally -- context intentionally owns the initial instance
  provideI18n(i18n);
</script>

<Child {name} />
