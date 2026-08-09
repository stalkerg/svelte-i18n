import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import svelteIcu from '../../../vite.js';

export default defineConfig({
  plugins: [svelteIcu({ locales: 'locales', mode: 'lazy' }), sveltekit()],
});
