export const setClassMetadata =
  <T>(key: string | symbol, mapFn: (prev: T | undefined) => T): ClassDecorator =>
  (target) => {
    const value: T | undefined = Reflect.getOwnMetadata(key, target);
    Reflect.defineMetadata(key, mapFn(value), target);
  };

export function getClassMetadata<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target);
}
