import { ArgsFn } from './provider/IProvider';

export const hook =
  (key: string | symbol, fn: ArgsFn = () => []): MethodDecorator =>
  (target, propertyKey) => {
    const hooks = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map<string, ArgsFn>();
    hooks.set(propertyKey, fn);
    Reflect.defineMetadata(key, hooks, target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

export function getHooks(target: object, key: string | symbol): Map<string, ArgsFn> {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : new Map();
}

export function hasHooks(target: object, key: string | symbol): boolean {
  return Reflect.hasMetadata(key, target.constructor);
}
