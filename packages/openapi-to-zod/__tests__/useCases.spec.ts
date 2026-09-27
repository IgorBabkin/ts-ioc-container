import { openapiToZod } from '../lib';
import { parseCliFlags } from '../lib/utils/cli';
import fs from 'fs';
import * as path from 'path';

const inputFile = path.resolve(__dirname, './swagger.yaml');
const outputDir = path.resolve(__dirname, '../.generated/use-cases');

describe('openapiToZod', () => {
  beforeAll(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('should write validators into the output file, creating directories as needed', () => {
    const outputFile = path.join(outputDir, 'nested', 'validators.ts');

    openapiToZod({ inputFile, outputFile });

    const output = fs.readFileSync(outputFile, 'utf8');
    expect(output).toContain("import {z} from 'zod';");
    expect(output).toContain('export const PAYLOADS = {');
  });
});

describe('parseCliFlags', () => {
  it('should parse long and short flags', () => {
    expect(parseCliFlags(['--input', 'in.yaml', '--output', 'out.ts'])).toEqual({ input: 'in.yaml', output: 'out.ts' });
    expect(parseCliFlags(['-i', 'in.yaml', '-o', 'out.ts'])).toEqual({ input: 'in.yaml', output: 'out.ts' });
  });

  it('should require input and output', () => {
    expect(() => parseCliFlags(['--output', 'out.ts'])).toThrow('--input');
    expect(() => parseCliFlags(['--input', 'in.yaml'])).toThrow('--output');
  });
});
