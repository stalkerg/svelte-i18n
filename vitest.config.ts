import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'node',
    exclude: ['packages/**/tests/e2e/**'],
    include: ['packages/**/{test,tests}/**/*.test.{js,ts}'],
    testTimeout: 10_000,
  },
});
