export const prop =
  <T>(key: string | symbol, value: T): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(key, value, target);
  };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getProp<T>(target: Object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target) as T;
}
