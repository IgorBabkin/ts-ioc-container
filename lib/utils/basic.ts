export type constructor<T> = new (...args: any[]) => T;

export interface InstanceOfClass<T = unknown> {
  new (...args: unknown[]): T;
}

export interface Instance<T = unknown> {
  new (...args: unknown[]): T;
}

export const Is = {
  nullish: <T>(value: T | undefined | null): value is null | undefined => value === undefined || value === null,
  object: (target: unknown): target is object => target !== null && typeof target === 'object',
  instance: (target: unknown): target is InstanceOfClass => Object.prototype.hasOwnProperty.call(target, 'constructor'),
  constructor: (target: unknown): target is constructor<unknown> => typeof target === 'function' && !!target.prototype,
};
