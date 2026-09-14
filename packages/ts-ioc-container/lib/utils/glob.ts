import { type Branded } from './basic';

/**
 * A glob over `/`-separated segments:
 *
 * - `*` matches part of a single segment, so `*` alone matches exactly one segment and `I*Token` matches one segment with that shape
 * - `**` matches zero or more whole segments
 *
 * `\` is accepted as a separator too, so a Windows path works as either side of a match.
 */
export type Glob = Branded<'Glob', string>;

/**
 * Builds a {@link Glob} out of a plain string, normalizing separators so a
 * pattern written with `\` matches the same paths as one written with `/`.
 */
export const glob = (value: string): Glob => value.replace(/\\+/g, '/').trim();

export const toSegments = (value: string): string[] =>
  value.split(/[\\/]+/).filter((segment) => segment !== '' && segment !== '.');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchSegment = (pattern: string, value: string): boolean =>
  pattern.includes('*')
    ? new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`).test(value)
    : pattern === value;

const matchFrom = (pattern: string[], value: string[], patternIndex: number, valueIndex: number): boolean => {
  if (patternIndex === pattern.length) {
    return valueIndex === value.length;
  }

  const segment = pattern[patternIndex];

  // `**` is the only segment which may span several of them, so it is the only one that branches.
  if (segment === '**') {
    for (let index = valueIndex; index <= value.length; index++) {
      if (matchFrom(pattern, value, patternIndex + 1, index)) {
        return true;
      }
    }
    return false;
  }

  return (
    valueIndex < value.length &&
    matchSegment(segment, value[valueIndex]) &&
    matchFrom(pattern, value, patternIndex + 1, valueIndex + 1)
  );
};

/**
 * Matches a `/`-separated path against a glob pattern, anchored at both ends.
 */
export const matchGlob = (pattern: Glob, value: string): boolean =>
  matchFrom(toSegments(pattern), toSegments(value), 0, 0);
