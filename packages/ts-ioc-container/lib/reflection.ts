export const setProp =
  <T>(key: string | symbol, value: T): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(key, value, target);
  };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getProp<T>(target: Object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target) as T;
}

export const hook =
  (key: string | symbol): MethodDecorator =>
  (target, propertyKey) => {
    const hooks = Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target) : [];
    Reflect.defineMetadata(key, [...hooks, propertyKey], target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getHooks(target: Object, key: string | symbol): string[] {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : [];
}
