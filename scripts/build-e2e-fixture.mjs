import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'packages/svelte-intl-precompile/tests/fixtures/sveltekit-lazy');
const vite = resolve(root, 'node_modules/vite/bin/vite.js');

const child = spawn(process.execPath, [vite, 'build'], {
  cwd: fixture,
  stdio: 'inherit',
});

child.on('error', (error) => {
  throw error;
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
