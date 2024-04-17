import { constructor } from './utils';

export const setMetadata =
  <T>(key: string | symbol, value: T): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(key, value, target);
  };

export function getMetadata<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target) as T;
}

export const setParameterMetadata =
  (key: string | symbol, value: unknown): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const metadata: unknown[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(key, metadata, target);
  };

export const getParameterMetadata = (key: string | symbol, target: constructor<unknown>): unknown[] => {
  return (Reflect.getOwnMetadata(key, target) as unknown[]) ?? [];
};

export const setMethodMetadata =
  (key: string, value: unknown): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(key, value, target.constructor, propertyKey);
  };

export const getMethodMetadata = (key: string, target: object, propertyKey: string): unknown =>
  Reflect.getMetadata(key, target.constructor, propertyKey);
