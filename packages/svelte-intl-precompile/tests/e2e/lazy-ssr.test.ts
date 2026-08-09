import { expect, test } from '@playwright/test';

test('concurrent SSR requests keep delayed locale data isolated', async ({ baseURL }) => {
  const requests = Array.from({ length: 20 }, (_, index) => {
    const locale = index % 2 === 0 ? 'en' : 'ja';
    return fetch(`${baseURL}/?locale=${locale}`).then(async (response) => ({
      locale,
      status: response.status,
      html: await response.text(),
    }));
  });

  for (const response of await Promise.all(requests)) {
    expect(response.status).toBe(200);
    if (response.locale === 'en') {
      expect(response.html).toContain('<h1 id="greeting">Hello Browser</h1>');
      expect(response.html).not.toContain('こんにちは Browser');
    } else {
      expect(response.html).toContain('<h1 id="greeting">こんにちは Browser</h1>');
      expect(response.html).not.toContain('Hello Browser');
    }
  }
});

test('lazy catalog hydrates and client navigation loads another locale', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/?locale=en');
  await expect(page.locator('#greeting')).toHaveText('Hello Browser');
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'en:Hello Browser');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.locator('#japanese').click();
  await expect(page).toHaveURL(/locale=ja/);
  await expect(page.locator('#greeting')).toHaveText('こんにちは Browser');
  await expect(page.locator('#language')).toHaveText('日本語');
  await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'ja:こんにちは Browser');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  expect(consoleErrors.filter((message) => /hydration|mismatch/i.test(message))).toEqual([]);
});
