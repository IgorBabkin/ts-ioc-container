export const hook =
  (key: string | symbol): MethodDecorator =>
  (target, propertyKey) => {
    const hooks = Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : [];
    Reflect.defineMetadata(key, [...hooks, propertyKey], target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getHooks(target: Object, key: string | symbol): string[] {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : [];
}
