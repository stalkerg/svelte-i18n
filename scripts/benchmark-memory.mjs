import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer } from 'vite';

if (!globalThis.gc) {
  throw new Error('This benchmark must run with node --expose-gc.');
}

const root = resolve(import.meta.dirname, '..');
const resultsDirectory = resolve(root, '.benchmark-results');
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  plugins: [svelte()],
  server: { middlewareMode: true },
});

try {
  const { createInstances } = await server.ssrLoadModule('/benchmarks/memory.suite.ts');
  const count = 25_000;

  function heapUsed() {
    globalThis.gc();
    globalThis.gc();
    return process.memoryUsage().heapUsed;
  }

  function measure(translate) {
    const before = heapUsed();
    let instances = createInstances(count, translate);
    const retained = heapUsed();
    const bytesPerInstance = (retained - before) / count;
    instances = undefined;
    const released = heapUsed();
    return { before, retained, released, bytesPerInstance };
  }

  // Warm V8 and the Svelte runtime before recording heap deltas.
  createInstances(100, true);
  heapUsed();

  const empty = measure(false);
  const translated = measure(true);
  const result = {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    instances: count,
    empty,
    translated,
  };

  await mkdir(resultsDirectory, { recursive: true });
  await writeFile(resolve(resultsDirectory, 'memory.json'), `${JSON.stringify(result, null, 2)}\n`);

  console.table({
    'empty instance': {
      'bytes/instance': Math.round(empty.bytesPerInstance),
      'heap after release': empty.released,
    },
    '20 translated ids': {
      'bytes/instance': Math.round(translated.bytesPerInstance),
      'heap after release': translated.released,
    },
  });
} finally {
  await server.close();
}
