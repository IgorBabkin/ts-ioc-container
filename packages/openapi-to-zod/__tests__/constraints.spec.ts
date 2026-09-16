import { renderValidators } from '../lib';
import { loadYAML } from './yaml';
import fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { ZodTypeAny } from 'zod';

const inputFile = path.resolve(__dirname, './constraints.yaml');
const outputFile = path.resolve(__dirname, './generated/constraints.ts');

type Generated = Record<string, ZodTypeAny> & { PAYLOADS: Record<string, ZodTypeAny> };

const accepts = (schema: ZodTypeAny, value: unknown) => schema.safeParse(value).success;

describe('validation constraints', () => {
  let validators: string;
  let generated: Generated;

  beforeAll(() => {
    validators = renderValidators(loadYAML<OpenAPIV3.Document>(inputFile));
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, validators);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    generated = require(outputFile);
  });

  it('should render the expected schemas', () => {
    expect(validators).toMatchSnapshot();
  });

  describe('strings', () => {
    it('should apply length, pattern and format constraints', () => {
      const { Strings } = generated;
      expect(accepts(Strings, { code: 'AB/12' })).toBe(true);
      expect(accepts(Strings, { code: 'A' })).toBe(false);
      expect(accepts(Strings, { code: 'ABCDEF/1' })).toBe(false);
      expect(accepts(Strings, { code: 'ab/12' })).toBe(false);
      expect(accepts(Strings, { code: 'AB/12', email: 'nope' })).toBe(false);
      expect(accepts(Strings, { code: 'AB/12', email: 'a@b.co' })).toBe(true);
      expect(accepts(Strings, { code: 'AB/12', id: 'not-a-uuid' })).toBe(false);
      expect(accepts(Strings, { code: 'AB/12', id: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })).toBe(true);
      expect(accepts(Strings, { code: 'AB/12', homepage: 'not a url' })).toBe(false);
      expect(accepts(Strings, { code: 'AB/12', homepage: 'https://example.com' })).toBe(true);
      expect(accepts(Strings, { code: 'AB/12', birthday: '2020-13-01' })).toBe(false);
      expect(accepts(Strings, { code: 'AB/12', birthday: '2020-12-01' })).toBe(true);
    });

    it('should keep date-time as a Date instance', () => {
      const parsed = generated.Strings.parse({ code: 'AB/12', createdAt: '2016-08-29T09:12:33.001Z' });
      expect(parsed.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('numbers', () => {
    it('should accept real numbers as well as numeric strings', () => {
      const { Numbers } = generated;
      expect(accepts(Numbers, { count: 3 })).toBe(true);
      expect(accepts(Numbers, { count: '3' })).toBe(true);
      expect(Numbers.parse({ count: '3' }).count).toBe(3);
      expect(accepts(Numbers, { count: 'three' })).toBe(false);
      expect(accepts(Numbers, { count: '' })).toBe(false);
    });

    it('should apply inclusive and exclusive bounds and multipleOf', () => {
      const { Numbers } = generated;
      expect(accepts(Numbers, { count: 10 })).toBe(true);
      expect(accepts(Numbers, { count: 11 })).toBe(false);
      expect(accepts(Numbers, { count: -1 })).toBe(false);
      expect(accepts(Numbers, { count: 1.5 })).toBe(false);
      expect(accepts(Numbers, { price: 0 })).toBe(false);
      expect(accepts(Numbers, { price: 0.5 })).toBe(true);
      expect(accepts(Numbers, { price: 0.7 })).toBe(false);
      expect(accepts(Numbers, { temperature: 100 })).toBe(false);
      expect(accepts(Numbers, { temperature: 99.9 })).toBe(true);
      expect(accepts(Numbers, { level: 0 })).toBe(false);
      expect(accepts(Numbers, { level: 5 })).toBe(false);
      expect(accepts(Numbers, { level: 3 })).toBe(true);
    });
  });

  describe('arrays', () => {
    it('should apply size and uniqueness constraints', () => {
      const { Arrays } = generated;
      expect(accepts(Arrays, { tags: ['a'] })).toBe(true);
      expect(accepts(Arrays, { tags: [] })).toBe(false);
      expect(accepts(Arrays, { tags: ['a', 'b', 'c', 'd'] })).toBe(false);
      expect(accepts(Arrays, { tags: ['a', 'a'] })).toBe(false);
      expect(accepts(Arrays, { tags: [1] })).toBe(false);
    });

    it('should accept anything for arrays without items', () => {
      expect(accepts(generated.Arrays, { anything: [1, 'two', { three: 3 }] })).toBe(true);
    });
  });

  describe('objects', () => {
    it('should honour additionalProperties', () => {
      const { Objects } = generated;
      expect(Objects.parse({ open: { name: 'x', extra: 1 } }).open).toEqual({ name: 'x', extra: 1 });
      expect(accepts(Objects, { closed: { name: 'x', extra: 1 } })).toBe(false);
      expect(accepts(Objects, { dictionary: { a: 1, b: 2 } })).toBe(true);
      expect(accepts(Objects, { dictionary: { a: 'one' } })).toBe(false);
      expect(Objects.parse({ freeForm: { any: 'thing' } }).freeForm).toEqual({ any: 'thing' });
    });

    it('should apply minProperties and maxProperties', () => {
      const { Objects } = generated;
      expect(accepts(Objects, { sized: {} })).toBe(false);
      expect(accepts(Objects, { sized: { a: '1' } })).toBe(true);
      expect(accepts(Objects, { sized: { a: '1', b: '2', c: '3' } })).toBe(false);
    });
  });

  describe('combinators', () => {
    it('should support oneOf, anyOf, allOf and not', () => {
      const { Combinators } = generated;
      expect(accepts(Combinators, { pet: { kind: 'cat', meows: true } })).toBe(true);
      expect(accepts(Combinators, { pet: { kind: 'dog', barks: false } })).toBe(true);
      expect(accepts(Combinators, { pet: { kind: 'cat', barks: false } })).toBe(false);
      expect(accepts(Combinators, { idOrCode: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })).toBe(true);
      expect(accepts(Combinators, { idOrCode: 7 })).toBe(true);
      expect(accepts(Combinators, { idOrCode: 'seven' })).toBe(false);
      expect(accepts(Combinators, { namedCat: { name: 'Tom', kind: 'cat', meows: true } })).toBe(true);
      expect(accepts(Combinators, { namedCat: { kind: 'cat', meows: true } })).toBe(false);
      expect(accepts(Combinators, { notAString: 1 })).toBe(true);
      expect(accepts(Combinators, { notAString: 'text' })).toBe(false);
    });

    it('should support const, enums, nullable and null types', () => {
      const { Combinators } = generated;
      expect(accepts(Combinators, { version: 2 })).toBe(true);
      expect(accepts(Combinators, { version: 3 })).toBe(false);
      expect(accepts(Combinators, { priority: 2 })).toBe(true);
      expect(accepts(Combinators, { priority: 4 })).toBe(false);
      expect(accepts(Combinators, { status: 'active' })).toBe(true);
      expect(accepts(Combinators, { status: 'deleted' })).toBe(false);
      expect(accepts(Combinators, { nickname: null })).toBe(true);
      expect(accepts(Combinators, { nickname: 1 })).toBe(false);
      expect(accepts(Combinators, { score: null })).toBe(true);
      expect(accepts(Combinators, { score: 1.5 })).toBe(true);
      expect(accepts(Combinators, { nothing: null })).toBe(true);
      expect(accepts(Combinators, { nothing: 0 })).toBe(false);
    });
  });

  describe('payloads', () => {
    it('should coerce and constrain query parameters', () => {
      const { searchItems } = generated.PAYLOADS;
      expect(searchItems.parse({ query: { page: '2', limit: '50', ratio: '0.5' } }).query).toEqual({
        page: 2,
        limit: 50,
        ratio: 0.5,
      });
      expect(accepts(searchItems, { query: {} })).toBe(true);
      expect(accepts(searchItems, { query: { page: '0' } })).toBe(false);
      expect(accepts(searchItems, { query: { limit: '101' } })).toBe(false);
      expect(accepts(searchItems, { query: { ratio: '0' } })).toBe(false);
      expect(accepts(searchItems, { query: { limit: 'invalid' } })).toBe(false);
    });

    it('should validate JSON bodies with real numbers', () => {
      const { createItem } = generated.PAYLOADS;
      expect(accepts(createItem, { body: { name: 'Widget', quantity: 1 } })).toBe(true);
      expect(accepts(createItem, { body: { name: 'Widget', quantity: 0 } })).toBe(false);
      expect(accepts(createItem, { body: { name: '', quantity: 1 } })).toBe(false);
    });
  });
});
