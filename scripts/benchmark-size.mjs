import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build, minify } from 'vite';

const root = resolve(import.meta.dirname, '..');
const cache = resolve(root, '.benchmark-cache', 'size');
const resultsDirectory = resolve(root, '.benchmark-results');
const baselineCommit = process.env.SVELTE_ICU_BASELINE_COMMIT ?? '3d809a0';
const runtime = 'packages/precompile-intl-runtime/dist/modules/index.js';

await mkdir(cache, { recursive: true });
await mkdir(resultsDirectory, { recursive: true });

const currentEntry = resolve(cache, 'current.js');
const legacyEntry = resolve(cache, 'legacy.js');
await writeFile(
  currentEntry,
  [
    `export {`,
    `  createI18n, provideI18n, useI18n,`,
    `  __interpolate, __plural, __offsetPlural, __select, __number, __date, __time`,
    `} from '../../${runtime}';`,
  ].join('\n'),
);
await writeFile(
  legacyEntry,
  [
    `export {`,
    `  init, addMessages, t,`,
    `  __interpolate, __plural, __offsetPlural, __select, __number, __date, __time`,
    `} from '../baseline/${runtime}';`,
  ].join('\n'),
);

async function bundleSize(entry, name) {
  const output = await build({
    root,
    configFile: false,
    logLevel: 'error',
    plugins: [svelte()],
    build: {
      target: 'es2022',
      minify: 'oxc',
      write: false,
      lib: { entry, formats: ['es'], fileName: name },
      rollupOptions: {
        external: (id) => id === 'svelte' || id.startsWith('svelte/'),
        output: { codeSplitting: false },
      },
    },
  });
  const outputs = Array.isArray(output) ? output.flatMap((item) => item.output) : output.output;
  const code = outputs
    .filter((item) => item.type === 'chunk')
    .map((item) => item.code)
    .join('\n');
  return { bytes: Buffer.byteLength(code), gzip: gzipSync(code, { level: 9 }).byteLength };
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

async function catalogSize() {
  const prefix = 'packages/babel-plugin-precompile-intl/test/fixtures/default/';
  const legacyFiles = git('ls-tree', '-r', '--name-only', baselineCommit, '--', prefix)
    .trim()
    .split('\n')
    .filter((file) => file.endsWith('/output.js'));
  const minified = { legacy: [], current: [] };
  const raw = { legacy: 0, current: 0 };

  for (const file of legacyFiles) {
    const legacySource = git('show', `${baselineCommit}:${file}`).replace(
      /(['"])precompile-intl-runtime\1/g,
      '$1runtime$1',
    );
    const currentSource = (await readFile(resolve(root, file), 'utf8')).replace(
      /(['"])@stalkerg\/precompile-intl-runtime\1/g,
      '$1runtime$1',
    );
    raw.legacy += Buffer.byteLength(legacySource);
    raw.current += Buffer.byteLength(currentSource);
    minified.legacy.push((await minify(file, legacySource)).code);
    minified.current.push((await minify(file, currentSource)).code);
  }

  const legacyCode = minified.legacy.join('\n');
  const currentCode = minified.current.join('\n');
  return {
    fixtures: legacyFiles.length,
    legacy: {
      raw: raw.legacy,
      minified: Buffer.byteLength(legacyCode),
      gzip: gzipSync(legacyCode, { level: 9 }).byteLength,
    },
    current: {
      raw: raw.current,
      minified: Buffer.byteLength(currentCode),
      gzip: gzipSync(currentCode, { level: 9 }).byteLength,
    },
  };
}

function collectImports(manifest, key, collected = new Set()) {
  if (!key || collected.has(key)) return collected;
  const entry = manifest[key];
  if (!entry) return collected;
  collected.add(key);
  for (const imported of entry.imports ?? []) collectImports(manifest, imported, collected);
  return collected;
}

async function fixtureModeSize(mode) {
  const fixture = resolve(root, 'packages/svelte-intl-precompile/tests/fixtures/sveltekit-lazy');
  const previousCwd = process.cwd();
  process.env.SVELTE_ICU_FIXTURE_MODE = mode;
  process.chdir(fixture);
  try {
    await build({ root: fixture, logLevel: 'error' });
  } finally {
    process.chdir(previousCwd);
    delete process.env.SVELTE_ICU_FIXTURE_MODE;
  }

  const client = resolve(fixture, '.svelte-kit/output/client');
  const manifest = JSON.parse(await readFile(resolve(client, '.vite/manifest.json'), 'utf8'));
  const rootLayout = Object.keys(manifest).find((key) => key.endsWith('/nodes/0.js'));
  const staticGraph = collectImports(manifest, rootLayout);
  const englishGraph = collectImports(manifest, '$locales/en');
  const additionalEnglish = new Set([...englishGraph].filter((key) => !staticGraph.has(key)));

  async function graphSize(keys) {
    let bytes = 0;
    let gzip = 0;
    for (const key of keys) {
      const file = manifest[key]?.file;
      if (!file?.endsWith('.js')) continue;
      const code = await readFile(resolve(client, file));
      bytes += code.byteLength;
      gzip += gzipSync(code, { level: 9 }).byteLength;
    }
    return { files: keys.size, bytes, gzip };
  }

  return {
    rootLayout: await graphSize(staticGraph),
    englishOnDemand: await graphSize(additionalEnglish),
  };
}

const [legacyRuntime, currentRuntime, catalogs] = await Promise.all([
  bundleSize(legacyEntry, 'legacy'),
  bundleSize(currentEntry, 'current'),
  catalogSize(),
]);
// SvelteKit builds share their output directory, so mode builds must stay sequential.
const eager = await fixtureModeSize('eager');
const lazy = await fixtureModeSize('lazy');

const result = {
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  baselineCommit,
  runtime: { legacy: legacyRuntime, current: currentRuntime },
  catalogs,
  fixture: { eager, lazy },
};
await writeFile(resolve(resultsDirectory, 'size.json'), `${JSON.stringify(result, null, 2)}\n`);

console.table({
  'legacy runtime': legacyRuntime,
  'current runtime': currentRuntime,
  'legacy catalogs': catalogs.legacy,
  'current catalogs': catalogs.current,
  'eager root layout': eager.rootLayout,
  'lazy root layout': lazy.rootLayout,
  'lazy en on demand': lazy.englishOnDemand,
});
