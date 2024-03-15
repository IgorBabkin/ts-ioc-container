export const setMetadata =
  <T>(key: string | symbol, value: T): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(key, value, target);
  };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getMetadata<T>(target: Object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target) as T;
}

export const setParameterMetadata =
  <T>(key: string | symbol, value: T): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const metadata: T[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(key, metadata, target);
  };
