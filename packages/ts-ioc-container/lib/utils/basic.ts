export type constructor<T> = new (...args: any[]) => T;

// Tags a structural type with a name, so `Instance` reads as its own type in signatures
// and error messages instead of a bare `object`. The tag is optional on purpose: values
// stay assignable without a cast, so callers pass a resolved instance directly.
export type Branded<TBrand extends string, T> = T & { readonly __brand?: TBrand };

// What the container tracks and reflects on: the object a constructor produced.
// Deliberately not a constructor signature — an instance is not its own constructor.
export type Instance = Branded<'Instance', object>;

export const Is = {
  nullish: <T>(value: T | undefined | null): value is null | undefined => value === undefined || value === null,
  object: (target: unknown): target is object => target !== null && typeof target === 'object',
  instance: (target: unknown): target is Instance => Object.prototype.hasOwnProperty.call(target, 'constructor'),
  constructor: (target: unknown): target is constructor<unknown> => typeof target === 'function' && !!target.prototype,
};
