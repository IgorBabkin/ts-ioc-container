import Handlebars from 'handlebars';
import { OpenAPIV3 } from 'openapi-types';
import { toIdentifier } from '../utils/identifier.js';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

Handlebars.registerHelper('capitalize', capitalize);
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

// eslint-disable-next-line @typescript-eslint/ban-types
Handlebars.registerHelper('has_some_key', function (context: object, keys: string[]) {
  // @ts-ignore
  return keys.some((key) => context[key]);
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

Handlebars.registerHelper('filter', function (arr: unknown[], methodName: string): unknown[] {
  switch (methodName) {
    case 'by_methods':
      return arr.filter((item) => {
        const value = item as OpenAPIV3.PathItemObject;
        return value.put ?? value.post ?? value.get ?? value.delete;
      });

    default:
      throw new Error(`Unknown filter ${methodName}`);
  }
});

Handlebars.registerHelper('object', function (...args: unknown[]) {
  return args.reduce((acc: any, [key, value]: any) => ({ ...acc, [key]: value }), {} as Record<string, string>);
});

Handlebars.registerHelper('route_name', function (operationId: string) {
  return `${capitalize(operationId)}Route`;
});

Handlebars.registerHelper('payload_name', function (operationId: string) {
  return `${capitalize(operationId)}Payload`;
});

Handlebars.registerHelper('response_name', function (operationId: string) {
  return `${capitalize(operationId)}Response`;
});
Handlebars.registerHelper('controller_name', function (tag: string) {
  return `I${toIdentifier(tag)}Controller`;
});

Handlebars.registerHelper('group_by_tags', function (paths: OpenAPIV3.PathsObject) {
  const grouped: Record<
    string,
    Array<{ operationId: string; operation: OpenAPIV3.OperationObject; method: string; path: string }>
  > = {};

  Object.entries(paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;

    ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
      const operation = pathItem[method as keyof OpenAPIV3.PathItemObject] as OpenAPIV3.OperationObject | undefined;
      if (operation?.operationId) {
        const tags = operation.tags || ['Default'];
        // Tags are free text, so they are normalised into identifiers before they reach the
        // templates; two tags that normalise to the same identifier share a controller.
        const tag = toIdentifier(tags[0]); // Use only the first tag
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push({
          operationId: operation.operationId!,
          operation,
          method,
          path,
        });
      }
    });
  });

  return grouped;
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
