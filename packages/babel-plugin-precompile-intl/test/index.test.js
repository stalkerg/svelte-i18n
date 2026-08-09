import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';
import buildPlugin from '../dist/index.js';

const plugin = buildPlugin();
const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'default');

describe('ICU compiler fixtures', () => {
  for (const fixture of readdirSync(fixturesRoot).sort()) {
    it(fixture, () => {
      const fixtureRoot = join(fixturesRoot, fixture);
      const input = readFileSync(join(fixtureRoot, 'input.js'), 'utf8');
      const expected = readFileSync(join(fixtureRoot, 'output.js'), 'utf8');
      const result = transformSync(input, { plugins: [plugin] });
      expect(result?.code).toBe(expected);
    });
  }

  it('passes ordinal plural type to the runtime', () => {
    const result = transformSync(
      'export default { place: "You finished {place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}" }',
      { plugins: [plugin] },
    );
    expect(result?.code).toContain('__plural(__ctx, __values["place"],');
    expect(result?.code).toContain('}, "ordinal")');
  });

  it('does not emit ICU argument names as JavaScript bindings', () => {
    const result = transformSync('export default { value: "Hello {delete}" }', {
      plugins: [plugin],
    });
    expect(result?.code).toContain('__values["delete"]');
  });
});
