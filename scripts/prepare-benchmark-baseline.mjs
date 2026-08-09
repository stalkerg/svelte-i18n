import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const commit = process.env.SVELTE_ICU_BASELINE_COMMIT ?? '3d809a0';
const packageRoot = 'packages/precompile-intl-runtime';
const sourcePrefix = `${packageRoot}/dist/modules/`;
const targetRoot = resolve(root, '.benchmark-cache', 'baseline');

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  } catch (error) {
    throw new Error(
      `Cannot prepare benchmark baseline ${commit}. The benchmark requires repository history ` +
        '(use a full clone or fetch the baseline commit).',
      { cause: error },
    );
  }
}

git('cat-file', '-e', `${commit}^{commit}`);
const files = git('ls-tree', '-r', '--name-only', commit, '--', sourcePrefix)
  .trim()
  .split('\n')
  .filter(Boolean);

if (files.length === 0) {
  throw new Error(`No runtime artifacts were found at ${commit}:${sourcePrefix}`);
}

await rm(targetRoot, { force: true, recursive: true });

for (const file of files) {
  const relative = file.slice(packageRoot.length + 1);
  const target = resolve(targetRoot, packageRoot, relative);
  await mkdir(dirname(target), { recursive: true });
  const contents = execFileSync('git', ['show', `${commit}:${file}`], {
    cwd: root,
    encoding: null,
  });
  await writeFile(target, contents);
}

await writeFile(
  resolve(targetRoot, 'metadata.json'),
  `${JSON.stringify({ commit, files: files.length }, null, 2)}\n`,
);

console.log(`Prepared legacy runtime ${commit} (${files.length} files).`);
