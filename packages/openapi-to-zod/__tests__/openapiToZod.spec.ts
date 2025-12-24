import { renderValidators } from '../lib';
import { loadYAML } from './yaml';
import fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';

const inputFile = path.resolve(__dirname, './swagger.yaml');
const outputFile = path.resolve(__dirname, '../.generated/validators.ts');

describe('renderValidators', () => {
  beforeAll(() => {
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  it('should generate Zod validators from OpenAPI spec', () => {
    const doc = loadYAML<OpenAPIV3.Document>(inputFile);
    const validators = renderValidators(doc);

    fs.writeFileSync(outputFile, validators);

    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.readFileSync(outputFile, 'utf-8')).toMatchSnapshot();
  });

  it('should contain Zod imports', () => {
    const doc = loadYAML<OpenAPIV3.Document>(inputFile);
    const validators = renderValidators(doc);

    expect(validators).toContain("import {z} from 'zod'");
  });

  it('should generate schema validators', () => {
    const doc = loadYAML<OpenAPIV3.Document>(inputFile);
    const validators = renderValidators(doc);

    // Should contain schema validators from components
    expect(validators).toContain('export const InventoryItem');
    expect(validators).toContain('export const Manufacturer');
  });

  it('should generate PAYLOADS object with operation validators', () => {
    const doc = loadYAML<OpenAPIV3.Document>(inputFile);
    const validators = renderValidators(doc);

    // Should contain PAYLOADS export
    expect(validators).toContain('export const PAYLOADS = {');
  });

  it('should generate validators with query, params, and body', () => {
    const doc = loadYAML<OpenAPIV3.Document>(inputFile);
    const validators = renderValidators(doc);

    // Should use z.object for payload validation
    expect(validators).toContain('z.object({');
  });
});
