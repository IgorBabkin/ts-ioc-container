import '../hbs/index.cjs';
import Handlebars from 'handlebars';

// A protocol is the declarative definition (schema) of a generated file, written as a Handlebars
// template in lib/protocols/. `build:hbs` precompiles them into hbs/index.cjs, which registers each
// one in the process-global `Handlebars.templates` under its file basename. Output is TypeScript,
// not HTML, so protocols interpolate with `{{{ }}}` and helpers return plain strings.
Handlebars.registerHelper('join', (items: string[], separator: string) => items.join(separator));

/**
 * Renders a precompiled protocol, looked up by its file basename (`Bundle.ts.hbs`).
 *
 * @throws {Error} when no protocol is registered under `name`.
 */
export function renderProtocol(name: string, data: unknown): string {
  const protocol = Handlebars.templates?.[name];
  if (!protocol) throw new Error(`Protocol not found: ${name}`);
  return protocol(data);
}
