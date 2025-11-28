import { constructor } from './types';

export const setClassMetadata =
  <T>(key: string | symbol, mapFn: (prev: T | undefined) => T): ClassDecorator =>
  (target) => {
    const value: T | undefined = Reflect.getOwnMetadata(key, target);
    Reflect.defineMetadata(key, mapFn(value), target);
  };

export function getClassMetadata<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, target);
}

export const setParameterMetadata =
  (key: string | symbol, mapFn: (prev: unknown) => unknown): ParameterDecorator =>
  (target, _, parameterIndex) => {
    const metadata: unknown[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = mapFn(metadata[parameterIndex]);
    Reflect.defineMetadata(key, metadata, target);
  };

export const getParameterMetadata = (key: string | symbol, target: constructor<unknown>): unknown[] => {
  return (Reflect.getOwnMetadata(key, target) as unknown[]) ?? [];
};

export const setMethodMetadata =
  <T>(key: string, mapFn: (prev: T | undefined) => T): MethodDecorator =>
  (target, propertyKey) => {
    const metadata: T | undefined = Reflect.getMetadata(key, target.constructor, propertyKey);
    Reflect.defineMetadata(key, mapFn(metadata), target.constructor, propertyKey);
  };

export const getMethodMetadata = (key: string, target: object, propertyKey: string): unknown =>
  Reflect.getMetadata(key, target.constructor, propertyKey);
