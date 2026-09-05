export type constructor<T> = new (...args: any[]) => T;

export interface Instance<T = unknown> {
  new (...args: unknown[]): T;
}

export const Is = {
  nullish: <T>(value: T | undefined | null): value is null | undefined => value === undefined || value === null,
  object: (target: unknown): target is object => target !== null && typeof target === 'object',
  instance: (target: unknown): target is Instance => Object.prototype.hasOwnProperty.call(target, 'constructor'),
  constructor: (target: unknown): target is constructor<unknown> => typeof target === 'function' && !!target.prototype,
};

export function resolveConstructor(target: object): object {
  return Is.constructor(target) ? target : (target as { constructor: object }).constructor;
}
