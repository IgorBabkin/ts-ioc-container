export const setMethodMetadata =
  <T>(key: string, mapFn: (prev: T | undefined) => T): MethodDecorator =>
  (target, propertyKey) => {
    const metadata: T | undefined = Reflect.getMetadata(key, target.constructor, propertyKey);
    Reflect.defineMetadata(key, mapFn(metadata), target.constructor, propertyKey);
  };
export const getMethodMetadata = (key: string, target: object, propertyKey: string): unknown =>
  Reflect.getMetadata(key, target.constructor, propertyKey);
