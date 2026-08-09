import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageDirectories = [
  'packages/babel-plugin-precompile-intl',
  'packages/precompile-intl-runtime',
  'packages/svelte-intl-precompile',
];
const manifests = packageDirectories.map((directory) => ({
  directory,
  manifest: JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8')),
}));
const expectedVersion = manifests[0].manifest.version;

function fail(message) {
  throw new Error(`[release validation] ${message}`);
}

function exportTargets(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(exportTargets);
}

for (const { directory, manifest } of manifests) {
  if (manifest.version !== expectedVersion) {
    fail(`${manifest.name} is ${manifest.version}; expected ${expectedVersion}.`);
  }
  if (manifest.private) fail(`${manifest.name} is marked private.`);
  if (manifest.publishConfig?.access !== 'public') {
    fail(`${manifest.name} must publish with public access.`);
  }
  if (!manifest.repository?.url?.endsWith('/stalkerg/svelte-icu.git')) {
    fail(`${manifest.name} points at an unexpected repository.`);
  }
  if (manifest.repository.directory !== directory) {
    fail(`${manifest.name} has an incorrect repository.directory.`);
  }

  const dependencyValues = Object.values({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  });
  if (dependencyValues.some((version) => version.startsWith('workspace:'))) {
    fail(`${manifest.name} still contains a workspace: dependency.`);
  }
}

const compiler = manifests[0].manifest;
const runtime = manifests[1].manifest;
const publicPackage = manifests[2].manifest;

for (const dependency of [compiler.name, runtime.name]) {
  if (publicPackage.dependencies?.[dependency] !== expectedVersion) {
    fail(`${publicPackage.name} must depend on ${dependency}@${expectedVersion} exactly.`);
  }
}
for (const manifest of [runtime, publicPackage]) {
  if (manifest.peerDependencies?.svelte !== '^5.0.0') {
    fail(`${manifest.name} must declare Svelte ^5.0.0 as a peer dependency.`);
  }
}

for (const { directory, manifest } of manifests) {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', `./${directory}`], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [pack] = JSON.parse(output);
  if (!pack || pack.name !== manifest.name || pack.version !== manifest.version) {
    fail(`${manifest.name} produced unexpected npm pack metadata.`);
  }

  const files = new Set(pack.files.map(({ path }) => path));
  const forbidden = [...files].filter(
    (path) =>
      path.startsWith('src/') ||
      path.startsWith('tests/') ||
      path.includes('/tests/') ||
      path.endsWith('.tgz') ||
      path.endsWith('package-lock.json'),
  );
  if (forbidden.length > 0) {
    fail(`${manifest.name} packs forbidden files: ${forbidden.join(', ')}.`);
  }

  const entrypoints = [
    manifest.main,
    manifest.module,
    manifest.types,
    ...exportTargets(manifest.exports),
  ]
    .filter(Boolean)
    .map((path) => path.replace(/^\.\//, ''))
    .filter((path) => path !== 'package.json');
  for (const entrypoint of entrypoints) {
    if (!files.has(entrypoint) || !existsSync(resolve(root, directory, entrypoint))) {
      fail(`${manifest.name} entry point ${entrypoint} is missing from the package.`);
    }
  }

  console.log(`validated ${pack.id} (${pack.entryCount} files, ${pack.size} bytes packed)`);
}

console.log('release package validation passed');
