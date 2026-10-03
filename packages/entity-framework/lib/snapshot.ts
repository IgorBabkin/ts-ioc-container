/**
 * Entity state is plain data — what a DTO holds: primitives, arrays, plain
 * objects, and dates. A snapshot copies exactly that; any other object — a
 * `LazyRef`, say — is kept as the same object, and compares by identity.
 */
export function snapshot<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((item) => snapshot(item)) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item)])) as T;
  }
  return value;
}

export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => isEqual(item, b[i]));
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length && aKeys.every((key) => Object.hasOwn(b, key) && isEqual(a[key], b[key]))
  );
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
