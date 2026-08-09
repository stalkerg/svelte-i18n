import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import svelteIcu from '../../../vite.js';

const catalogMode = process.env.SVELTE_ICU_FIXTURE_MODE === 'eager' ? 'eager' : 'lazy';

export default defineConfig({
  plugins: [
    svelteIcu({ locales: fileURLToPath(new URL('locales', import.meta.url)), mode: catalogMode }),
    sveltekit(),
  ],
});
