import { parseCliFlags } from '../lib/utils/cli';

describe('parseCliFlags', () => {
  it('should parse long flags', () => {
    expect(parseCliFlags(['--input', 'in.yaml', '--output', 'out.ts', '--json'])).toEqual({
      input: 'in.yaml',
      output: 'out.ts',
      json: true,
    });
  });

  it('should parse short flags and default json to false', () => {
    expect(parseCliFlags(['-i', 'in.yaml', '-o', 'out.ts'])).toEqual({
      input: 'in.yaml',
      output: 'out.ts',
      json: false,
    });
  });

  it('should require input and output', () => {
    expect(() => parseCliFlags(['--output', 'out.ts'])).toThrow('--input');
    expect(() => parseCliFlags(['--input', 'in.yaml'])).toThrow('--output');
  });

  it('should reject unknown flags', () => {
    expect(() => parseCliFlags(['--input', 'a', '--output', 'b', '--nope'])).toThrow();
  });
});
