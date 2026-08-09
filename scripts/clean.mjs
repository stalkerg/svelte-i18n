import { rm } from 'node:fs/promises';
import { isAbsolute, normalize, resolve } from 'node:path';

for (const target of process.argv.slice(2)) {
  const normalized = normalize(target);
  if (
    isAbsolute(normalized) ||
    normalized === '..' ||
    normalized.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  ) {
    throw new Error(`Refusing to clean path outside the package: ${target}`);
  }
  await rm(resolve(normalized), { force: true, recursive: true });
}
