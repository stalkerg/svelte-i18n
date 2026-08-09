import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import InstanceProvider from './fixtures/InstanceProvider.svelte';
import Provider from './fixtures/Provider.svelte';
import { createI18n, type Catalogs } from '../dist/modules/index.js';

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

  it('accepts a callable instance without mistaking it for an options thunk', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { greeting: (_context, values) => `Hello ${values.name}` } },
    });
    const result = render(InstanceProvider, { props: { i18n, name: 'Callable' } });

    expect(result.body).toContain('<p lang="en">Hello Callable</p>');
  });
});
