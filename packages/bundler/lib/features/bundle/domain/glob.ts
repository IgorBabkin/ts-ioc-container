/**
 * Converts a glob to an anchored RegExp over `/`-separated paths: `**` spans
 * folders (`**\/` also matches none), `*` and `?` stay within one segment.
 */
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

export const toPosix = (file: string): string => file.split('\\').join('/');

/** Whether a path is a glob: it has a `*` or a `?`. */
export const isGlob = (spec: string): boolean => /[*?]/.test(spec);

/**
 * Splits a glob at its first segment with a wildcard: the folder before it and the glob of
 * what lies below. `src/**\/*.service.ts` -> `src` and `**\/*.service.ts`; `*.ts` -> `.` and `*.ts`.
 */
export function splitGlob(glob: string): { base: string; pattern: string } {
  const segments = toPosix(glob).split('/');
  const first = segments.findIndex(isGlob);
  return { base: segments.slice(0, first).join('/') || '.', pattern: segments.slice(first).join('/') };
}
