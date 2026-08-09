import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import svelteI18n from '../vite.js';

let localesRoot: string;

beforeAll(async () => {
  localesRoot = await mkdtemp(join(tmpdir(), 'svelte-icu-'));
  await Promise.all([
    writeFile(
      join(localesRoot, 'en.json'),
      JSON.stringify({ simple: 'Simple string', interpolated: 'Hello {value}' }),
    ),
    writeFile(join(localesRoot, 'en-US.json'), JSON.stringify({ simple: 'US English' })),
    writeFile(
      join(localesRoot, 'es.json'),
      JSON.stringify({ simple: 'Cadena simple', interpolated: 'Hola {value}' }),
    ),
    writeFile(join(localesRoot, 'gl.yaml'), 'simple: Cadea simple\ninterpolated: Ola {value}\n'),
    writeFile(join(localesRoot, 'ignored.txt'), 'not a locale'),
  ]);
});

afterAll(async () => {
  await rm(localesRoot, { recursive: true, force: true });
});

async function resolveAndLoad(plugin: ReturnType<typeof svelteI18n>, id: string) {
  const resolveId = plugin.resolveId as (id: string) => string;
  const load = plugin.load as (id: string) => string | Promise<string>;
  return load(resolveId(id));
}

describe('virtual locale modules', () => {
  it('generates eager request-safe catalogs by default', async () => {
    const plugin = svelteI18n({ locales: localesRoot });
    const code = await resolveAndLoad(plugin, '$locales');

    expect(code).toContain('import __locale0 from "$locales/en";');
    expect(code).toContain(
      'export const availableLocales = Object.freeze(["en","es","gl","en-US"]);',
    );
    expect(code).toContain('export const catalogs = Object.freeze({"en": __locale0');
    expect(code).toContain('export const loaders = Object.freeze({});');
    expect(code).not.toContain('register(');
  });

  it('generates loaders without eager imports in lazy mode', async () => {
    const plugin = svelteI18n({ locales: localesRoot, mode: 'lazy' });
    const code = await resolveAndLoad(plugin, '$locales');

    expect(code).not.toContain('import __locale');
    expect(code).toContain('export const catalogs = Object.freeze({});');
    expect(code).toContain('"en": () => import("$locales/en").then');
  });

  it('precompiles JSON messages with the explicit v2 context contract', async () => {
    const plugin = svelteI18n({ locales: localesRoot });
    const code = await resolveAndLoad(plugin, '$locales/en');

    expect(code).toContain('import { __interpolate } from "@stalkerg/svelte-icu";');
    expect(code).toContain(
      '"interpolated": (__ctx, __values) => `Hello ${__interpolate(__values["value"])}`',
    );
  });

  it('supports YAML locale files', async () => {
    const plugin = svelteI18n({ locales: localesRoot });
    const code = await resolveAndLoad(plugin, '$locales/gl');
    expect(code).toContain('"simple": "Cadea simple"');
    expect(code).toContain('__values["value"]');
  });

  it('rejects traversal through a virtual locale id', async () => {
    const plugin = svelteI18n({ locales: localesRoot });
    await expect(resolveAndLoad(plugin, '$locales/../secret')).rejects.toThrow(
      'Invalid locale name',
    );
  });
});
