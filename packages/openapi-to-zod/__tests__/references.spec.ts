import { renderValidators } from '../lib';
import { loadYAML } from './yaml';
import fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { ZodTypeAny } from 'zod';

const inputFile = path.resolve(__dirname, './references.yaml');
const outputFile = path.resolve(__dirname, './generated/references.ts');

type Generated = Record<string, ZodTypeAny<any, any>> & { PAYLOADS: Record<string, ZodTypeAny<any, any>> };

const accepts = (schema: ZodTypeAny<any, any>, value: unknown) => schema.safeParse(value).success;

const declarationOrder = (source: string) =>
  [...source.matchAll(/^export const (\w+) = /gm)].map(([, name]) => name).filter((name) => name !== 'PAYLOADS');

describe('schema references', () => {
  let doc: OpenAPIV3.Document;
  let validators: string;
  let generated: Generated;

  beforeAll(() => {
    doc = loadYAML<OpenAPIV3.Document>(inputFile);
    validators = renderValidators(doc);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, validators);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    generated = require(outputFile);
  });

  it('should render the expected schemas', () => {
    expect(validators).toMatchSnapshot();
  });

  it('should declare every schema after the schemas it references', () => {
    expect(declarationOrder(validators)).toEqual([
      'Category',
      'DriverType',
      'Vehicle',
      'ChargingSessionSummary',
      'Node',
      'Edge',
    ]);
  });

  it('should not mutate the document', () => {
    expect(doc).toEqual(loadYAML<OpenAPIV3.Document>(inputFile));
  });

  it('should validate against forward-referenced schemas', () => {
    const { ChargingSessionSummary } = generated;
    expect(accepts(ChargingSessionSummary, { id: '1', driverType: 'guest' })).toBe(true);
    expect(accepts(ChargingSessionSummary, { id: '1', driverType: 'alien' })).toBe(false);
    expect(
      accepts(ChargingSessionSummary, { id: '1', driverType: 'fleet', vehicle: { plate: 'X', driverType: 'fleet' } }),
    ).toBe(true);
    expect(accepts(ChargingSessionSummary, { id: '1', driverType: 'fleet', vehicle: { plate: 'X' } })).toBe(false);
    expect(accepts(generated.PAYLOADS.createSession, { body: { id: '1', driverType: 'employee' } })).toBe(true);
  });

  it('should defer self references through getters', () => {
    expect(validators).toContain('get children() { return z.array(Category).optional(); }');
    expect(validators).toContain('get parent() { return Category.optional(); }');

    const { Category } = generated;
    expect(accepts(Category, { name: 'root', children: [{ name: 'leaf', parent: { name: 'root' } }] })).toBe(true);
    expect(accepts(Category, { name: 'root', children: [{ name: 'leaf', children: [{}] }] })).toBe(false);
  });

  it('should defer the back edge of mutually recursive schemas', () => {
    expect(validators).toContain('get edges() { return z.array(Edge).optional(); }');
    expect(validators).toContain('to: Node,');

    const { Node, Edge } = generated;
    expect(accepts(Node, { id: 'a', edges: [{ to: { id: 'b', edges: [{ to: { id: 'a' } }] } }] })).toBe(true);
    expect(accepts(Edge, { to: { id: 'b', edges: [{ to: {} }] } })).toBe(false);
  });

  it('should wrap a back edge outside an object property in z.lazy', () => {
    const source = renderValidators({
      openapi: '3.0.0',
      info: { title: 'Nested', version: '1' },
      paths: {},
      components: {
        schemas: {
          Nested: { type: 'array', items: { $ref: '#/components/schemas/Nested' } },
          Either: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Either' }] },
        },
      },
    });
    expect(source).toContain('export const Nested = z.array(z.lazy(() => Nested));');
    expect(source).toContain('export const Either = z.union([z.string(), z.lazy(() => Either)]);');
  });
});
