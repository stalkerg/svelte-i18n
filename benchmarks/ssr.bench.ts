import { render } from 'svelte/server';
import { bench, describe } from 'vitest';
import CurrentSsr from './fixtures/CurrentSsr.svelte';
import LegacySsr from './fixtures/LegacySsr.svelte';

describe('warm SSR render with 50 translations', () => {
  bench('legacy: one render with global stores', () => render(LegacySsr).body.length);
  bench(
    'current: one request-scoped render',
    () => render(CurrentSsr, { props: { locale: 'en-US' } }).body.length,
  );
});

describe('20 SSR renders per sample', () => {
  bench('legacy: 20 renders with global stores', () => {
    let bytes = 0;
    for (let index = 0; index < 20; index += 1) bytes += render(LegacySsr).body.length;
    return bytes;
  });
  bench('current: 20 request-scoped renders', () => {
    let bytes = 0;
    for (let index = 0; index < 20; index += 1) {
      bytes += render(CurrentSsr, {
        props: { locale: index % 2 === 0 ? 'en-US' : 'en' },
      }).body.length;
    }
    return bytes;
  });
});
