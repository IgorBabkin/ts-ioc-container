import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ticConfigJsonSchema } from '../lib';

describe('tic.schema.json', () => {
  it('given the zod config schema when the schema is generated then it equals the committed file', () => {
    const committed = JSON.parse(readFileSync(path.resolve(__dirname, '../tic.schema.json'), 'utf8'));

    // Stale? Run `pnpm run generate:schema`.
    expect(ticConfigJsonSchema()).toEqual(committed);
  });

  it('given the config schema when its fields are read then none nests another: configs merge one level deep', () => {
    const { properties } = ticConfigJsonSchema() as { properties: Record<string, { type?: string }> };

    const nested = Object.entries(properties).filter(([, field]) => field.type === 'object');

    expect(nested).toEqual([]);
  });
});
