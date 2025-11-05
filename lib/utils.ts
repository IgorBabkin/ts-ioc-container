import { DependencyKey } from './container/IContainer';

export type constructor<T> = new (...args: any[]) => T;

export interface InstanceOfClass<T = unknown> {
  new (...args: unknown[]): T;
}

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

export function lazyProxy<T>(resolveInstance: () => T): T {
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

export function toLazyIf<T>(resolveInstance: () => T, isLazy: boolean = false): T {
  if (isLazy) {
    return lazyProxy(resolveInstance);
  }
  return resolveInstance();
}

export const promisify = <T>(arg: T | Promise<T>): Promise<T> => (arg instanceof Promise ? arg : Promise.resolve(arg));

export const Filter = {
  exclude: <T>(arr: Set<T> | T[]) => {
    const excludeSet = arr instanceof Array ? new Set(arr) : arr;
    return (v: T) => !excludeSet.has(v);
  },
};

export const Is = {
  nullish: <T>(value: T | undefined | null): value is null | undefined => value === undefined || value === null,
  object: (target: unknown): target is object => target !== null && typeof target === 'object',
  instance: (target: unknown): target is InstanceOfClass => Object.prototype.hasOwnProperty.call(target, 'constructor'),
  constructor: (target: unknown): target is constructor<unknown> => typeof target === 'function' && !!target.prototype,
  dependencyKey: (target: unknown): target is DependencyKey => ['string', 'symbol'].includes(typeof target),
};
