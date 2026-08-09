import { defineConfig, devices } from '@playwright/test';

const fixtureRoot = 'packages/svelte-intl-precompile/tests/fixtures/sveltekit-lazy';

export default defineConfig({
  testDir: 'packages/svelte-intl-precompile/tests/e2e',
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node build/index.js',
    cwd: fixtureRoot,
    env: {
      HOST: '127.0.0.1',
      PORT: '4179',
    },
    port: 4179,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
