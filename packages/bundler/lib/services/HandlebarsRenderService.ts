import '../../tpl/index.cjs';
import Handlebars from 'handlebars';
import { register, SingleToken } from 'ts-ioc-container';

// A protocol is the declarative definition (schema) of a generated file, written as a Handlebars
// template in lib/protocols/. `hbs:compile` precompiles them into tpl/index.cjs, which registers each
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

/** Turns prepared data into a generated file through its protocol. */
export interface IRenderService {
  /**
   * @throws {Error} when no protocol is registered under `protocol`.
   */
  render(protocol: string, data: unknown): string;
}

export const IRenderServiceKey = new SingleToken<IRenderService>('IRenderService');

@register(IRenderServiceKey)
export class HandlebarsRenderService implements IRenderService {
  /**
   * @throws {Error} when no protocol is registered under `protocol`.
   */
  render(protocol: string, data: unknown): string {
    return renderProtocol(protocol, data);
  }
}
