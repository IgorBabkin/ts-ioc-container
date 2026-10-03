import { parseArgs, type ParseArgsConfig } from 'node:util';
import { type InjectOptions } from 'ts-ioc-container';
import { z, type ZodType } from 'zod';
import { UsageError } from '../exceptions/DomainException';

type OptionsConfig = NonNullable<ParseArgsConfig['options']>;

/** The raw command line a CLI action was invoked with, handed to it as its runtime args. */
export const commandArgs = ({ args = [] }: InjectOptions): string[] => args.map(String);

/**
 * Mapper that parses the raw command line against an action's options. Everything
 * from the first flag onwards belongs to the action — what precedes it is the
 * command and the action name.
 *
 * With `positionals`, the default action of a command takes arguments too: everything
 * after the command is parsed, and the words that are not flags or their values come
 * back as `positionals` (`tic build app.bundle.json`).
 *
 * @throws {UsageError} when a flag is unknown or a flag that takes a value has none.
 */
export const parseOptions =
  (options: OptionsConfig, { positionals = false }: { positionals?: boolean } = {}) =>
  (argv: string[]): Record<string, unknown> => {
    const firstFlag = argv.findIndex((arg) => arg.startsWith('-'));
    const args = positionals ? argv.slice(1) : firstFlag >= 0 ? argv.slice(firstFlag) : [];
    try {
      const parsed = parseArgs({ args, options, strict: true, allowPositionals: positionals });
      return positionals ? { ...parsed.values, positionals: parsed.positionals } : { ...parsed.values };
    } catch (e) {
      throw new UsageError((e as Error).message);
    }
  };

/**
 * Mapper that validates a loosely-typed value — parsed options in practice —
 * against a schema and narrows it to the schema's output type.
 *
 * @throws {UsageError} when the value does not match the schema.
 */
export const validate =
  <T extends ZodType>(schema: T) =>
  (value: unknown): z.output<T> => {
    const result = schema.safeParse(value);
    if (!result.success) throw new UsageError(z.prettifyError(result.error));
    return result.data;
  };
