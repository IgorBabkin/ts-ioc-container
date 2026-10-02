import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { renderComponents } from '../lib';
import { renderTemplate } from '../lib/templates';

const templateDir = path.resolve(__dirname, '../lib/templates');
const basenames = fs.readdirSync(templateDir).filter((file) => file.endsWith('.hbs'));

describe('SPEC-006 · shared Handlebars registry', () => {
  // TR-1 — importing the package registers its templates, keyed by file basename, on the one
  // global Handlebars instance.
  it('registers every template under its file basename', () => {
    expect(basenames.length).toBeGreaterThan(0);

    for (const basename of basenames) {
      expect(Handlebars.templates[basename]).toBeInstanceOf(Function);
    }
  });

  // TR-3
  it('throws when a template name is not registered', () => {
    expect(() => renderTemplate('NotThere.hbs', {})).toThrow('Template not found: NotThere.hbs');
  });

  // TR-6 — nested renders are SafeStrings, so generated TypeScript is not HTML-escaped.
  it('does not escape nested template output', () => {
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'escaping', version: '1.0.0' },
      components: {
        schemas: {
          Item: {
            type: 'object',
            required: ['nested'],
            properties: { nested: { type: 'object', properties: { flag: { type: 'boolean' } } } },
          },
        },
      },
      paths: {},
    };

    const components = renderComponents(doc);

    expect(components).toContain('flag?: boolean');
    expect(components).not.toContain('&quot;');
    expect(components).not.toContain('&#x27;');
    expect(components).not.toContain('&lt;');
  });
});
