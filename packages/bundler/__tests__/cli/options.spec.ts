import { z } from 'zod';
import { parseOptions, UsageError, validate } from '../../lib';

const parse = parseOptions({ config: { type: 'string', short: 'c' }, check: { type: 'boolean' } });

describe('parseOptions', () => {
  it('given a command line when parsed then only the flags after the command and action are read', () => {
    expect(parse(['build', '-c', 'tic.json', '--check'])).toEqual({ config: 'tic.json', check: true });
    expect(parse(['build', '--config=tic.json'])).toEqual({ config: 'tic.json' });
    expect(parse(['build'])).toEqual({});
  });

  it('given positionals allowed when parsed then the words after the command come back as positionals', () => {
    const withPositionals = parseOptions(
      { json: { type: 'string' }, check: { type: 'boolean' } },
      { positionals: true },
    );

    expect(withPositionals(['build', 'src/app.bundle.ts', '--json', '-', '--check'])).toEqual({
      json: '-',
      check: true,
      positionals: ['src/app.bundle.ts'],
    });
    expect(withPositionals(['build', '--json={}', 'src/app.bundle.ts'])).toEqual({
      json: '{}',
      positionals: ['src/app.bundle.ts'],
    });
  });

  it('given an unknown flag when parsed then it throws UsageError', () => {
    expect(() => parse(['build', '--watch'])).toThrow(UsageError);
  });

  it('given a value flag without its value when parsed then it throws UsageError', () => {
    expect(() => parse(['build', '--config'])).toThrow(UsageError);
  });
});

describe('validate', () => {
  const schema = z.object({ check: z.boolean().default(false) });

  it('given valid options when validated then defaults are filled in', () => {
    expect(validate(schema)({})).toEqual({ check: false });
  });

  it('given invalid options when validated then it throws UsageError', () => {
    expect(() => validate(schema)({ check: 'yes' })).toThrow(UsageError);
  });
});
