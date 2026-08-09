import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Provider from './fixtures/Provider.svelte';
import type { Catalogs } from '../dist/modules/index.js';

describe('Svelte 5 context', () => {
  it('keeps parallel SSR trees isolated', async () => {
    const messages: Catalogs = {
      en: { greeting: (_context, values) => `Hello ${values.name}` },
      ja: { greeting: (_context, values) => `こんにちは ${values.name}` },
    };

    const [english, japanese] = await Promise.all([
      Promise.resolve(
        render(Provider, {
          props: { options: { locale: 'en', messages }, name: 'Alex' },
        }),
      ),
      Promise.resolve(
        render(Provider, {
          props: { options: { locale: 'ja', messages }, name: 'Aki' },
        }),
      ),
    ]);

    expect(english.body).toContain('<p lang="en">Hello Alex</p>');
    expect(english.body).not.toContain('こんにちは');
    expect(japanese.body).toContain('<p lang="ja">こんにちは Aki</p>');
    expect(japanese.body).not.toContain('Hello');
  });
});
