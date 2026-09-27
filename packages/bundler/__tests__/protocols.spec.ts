import { readdirSync } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { renderProtocol } from '../lib/render';

const protocolDir = path.resolve(__dirname, '../lib/protocols');
const basenames = readdirSync(protocolDir).filter((file) => file.endsWith('.hbs'));

describe('Generated modules are rendered from precompiled Handlebars protocols', () => {
  it('registers every protocol under its file basename', () => {
    expect(basenames).toContain('Bundle.ts.hbs');

    for (const basename of basenames) {
      expect(Handlebars.templates[basename]).toBeInstanceOf(Function);
    }
  });

  it('throws when a protocol name is not registered', () => {
    expect(() => renderProtocol('NotThere.hbs', {})).toThrow('Protocol not found: NotThere.hbs');
  });
});
