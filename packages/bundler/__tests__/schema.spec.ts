import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ticConfigJsonSchema } from '../lib';

describe('tic.schema.json', () => {
  it('given the zod config schema when the schema is generated then it equals the committed file', () => {
    const committed = JSON.parse(readFileSync(path.resolve(__dirname, '../tic.schema.json'), 'utf8'));

    // Stale? Run `pnpm run generate:schema`.
    expect(ticConfigJsonSchema()).toEqual(committed);
  });
});
