import { parseArgs } from 'node:util';

export type CliFlags = { input: string; output: string };

export function parseCliFlags(argv: string[]): CliFlags {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
    },
    strict: true,
  });

  if (!values.input) {
    throw new Error('openapi file path is required (--input)');
  }
  if (!values.output) {
    throw new Error('output file path is required (--output)');
  }

  return { input: values.input, output: values.output };
}
