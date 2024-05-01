export type constructor<T> = new (...args: any[]) => T;

export type MapFn<T> = (value: T) => T;

export const pipe =
  <T>(...mappers: MapFn<T>[]): MapFn<T> =>
  (value) =>
    mappers.reduce((acc, current) => current(acc), value);

export function fillEmptyIndexes<T>(baseArr: (T | undefined)[], insertArr: T[]): T[] {
  const a = [...baseArr];
  const b = [...insertArr];

  for (let i = 0; i < a.length; i++) {
    if (a[i] === undefined) {
      a[i] = b.shift() as T;
    }
  }
  return a.concat(b) as T[];
}

export const constant =
  <T>(value: T) =>
  () =>
    value;

export const isConstructor = (T: unknown): T is constructor<unknown> => typeof T === 'function' && !!T.prototype;

export function lazyInstance<T>(resolveInstance: () => T, isLazy?: boolean): T {
  if (!isLazy) {
    return resolveInstance();
  }

  let instance: T | undefined;
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        instance = instance ?? resolveInstance();
        // @ts-ignore
        return instance[prop];
      },
    },
  ) as T;
}
