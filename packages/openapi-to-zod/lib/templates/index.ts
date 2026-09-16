import Handlebars from 'handlebars';
import { OpenAPIV3 } from 'openapi-types';

Handlebars.registerHelper('capitalize', function (value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
});

Handlebars.registerHelper('excludes', function (arr: string[] | undefined = [], value: string) {
  return !arr.includes(value);
});

Handlebars.registerHelper('includes', function (arr: unknown[], value: unknown) {
  return arr.includes(value);
});

Handlebars.registerHelper('is_equal', function (a: unknown, b: unknown) {
  return a === b;
});

Handlebars.registerHelper('has_property', function (a: unknown) {
  return !!a;
});

Handlebars.registerHelper('json', function (value: unknown) {
  return new Handlebars.SafeString(JSON.stringify(value));
});

const last = (arr: string[]) => arr[arr.length - 1];
Handlebars.registerHelper('render_ref', function (value: string) {
  return last(value.split('/'));
});

Handlebars.registerHelper('filter_parameters', function (list: { in: string }[], value: string) {
  return list.filter((item) => item.in === value);
});

Handlebars.registerHelper('some_parameters', function (list: { in: string }[], value: string) {
  return list.some((item) => item.in === value);
});

// eslint-disable-next-line @typescript-eslint/ban-types
Handlebars.registerHelper('get_value_by_key', function (context: object, pathString: string) {
  const keys = pathString.split('.');
  // @ts-ignore
  return keys.reduce((acc, key) => (acc ? acc[key] : undefined), context);
});

Handlebars.registerHelper('array', function (...args: unknown[]) {
  return args;
});

Handlebars.registerHelper('is_defined', function (value: unknown) {
  return value !== undefined && value !== null;
});

Handlebars.registerHelper('is_empty', function (value: object | undefined) {
  return !value || Object.keys(value).length === 0;
});

Handlebars.registerHelper('all_strings', function (values: unknown[]) {
  return values.every((value) => typeof value === 'string');
});

// OpenAPI 3.1 allows `type: ['string', 'null']`; 3.0 uses `nullable: true` next to a single type.
Handlebars.registerHelper('base_type', function (schema: { type?: string | string[] }) {
  return Array.isArray(schema.type) ? schema.type.find((type) => type !== 'null') : schema.type;
});

Handlebars.registerHelper('is_nullable', function (schema: { type?: string | string[]; nullable?: boolean }) {
  return schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'));
});

// `exclusiveMinimum`/`exclusiveMaximum` are booleans modifying `minimum`/`maximum` in OpenAPI 3.0 and numbers in 3.1.
Handlebars.registerHelper(
  'number_constraints',
  function (schema: {
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number | boolean;
    exclusiveMaximum?: number | boolean;
    multipleOf?: number;
  }) {
    const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = schema;
    const parts: string[] = [];
    if (typeof exclusiveMinimum === 'number') {
      parts.push(`.gt(${exclusiveMinimum})`);
    } else if (typeof minimum === 'number') {
      parts.push(exclusiveMinimum === true ? `.gt(${minimum})` : `.gte(${minimum})`);
    }
    if (typeof exclusiveMaximum === 'number') {
      parts.push(`.lt(${exclusiveMaximum})`);
    } else if (typeof maximum === 'number') {
      parts.push(exclusiveMaximum === true ? `.lt(${maximum})` : `.lte(${maximum})`);
    }
    if (typeof multipleOf === 'number') {
      parts.push(`.multipleOf(${multipleOf})`);
    }
    return new Handlebars.SafeString(parts.join(''));
  },
);

Handlebars.registerHelper('get_methods', function (items: OpenAPIV3.PathsObject) {
  return Object.entries(items)
    .map(([_, item]) => item!.put ?? item!.post ?? item!.get ?? item!.delete)
    .filter(Boolean);
});

Handlebars.registerHelper('get_methods_obj', function (item: OpenAPIV3.PathItemObject) {
  const output: Record<string, unknown> = {};
  item.put && (output['put'] = item.put);
  item.delete && (output['delete'] = item.delete);
  item.post && (output['post'] = item.post);
  item.get && (output['get'] = item.get);
  return output;
});

export function renderTemplate(filename: string, data: unknown) {
  const template = Handlebars.templates[filename];
  if (!template) {
    throw new Error(`Template not found: ${filename}`);
  }
  return template(data);
}

Handlebars.registerHelper(
  'render_template',
  (filename: string, data: unknown) => new Handlebars.SafeString(renderTemplate(filename, data)),
);
