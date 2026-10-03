/**
 * Entity state is plain data — what a DTO holds: primitives, arrays, plain
 * objects, and dates. A snapshot is a structured clone of it, and two states
 * are compared field by field, deeply, with dates compared by time.
 */
export const snapshot = <T>(value: T): T => structuredClone(value);

export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) => Object.hasOwn(b, key) && isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}
