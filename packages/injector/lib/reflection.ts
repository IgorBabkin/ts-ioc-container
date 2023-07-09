export const prop =
  <T>(key: string | symbol, value: T): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(key, value, target);
  };

export const attr =
  (key: string | symbol) =>
  <T>(value: T): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const metadata = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(key, metadata, target);
  };

export const field =
  <T>(key: string | symbol, value: T): PropertyDecorator =>
  (target, propertyKey) => {
    const metadata = Reflect.getMetadata(key, target) ?? new Map();
    metadata.set(propertyKey, value);
    Reflect.defineMetadata(key, metadata, target);
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
