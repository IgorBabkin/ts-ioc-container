import { resolveConstructor } from '../utils/basic';

export const methodMeta =
  <T>(key: string, mapFn: (prev: T | undefined) => T): MethodDecorator =>
  (target, propertyKey) => {
    const metadata: T | undefined = Reflect.getMetadata(key, target.constructor, propertyKey);
    Reflect.defineMetadata(key, mapFn(metadata), target.constructor, propertyKey);
  };
export const getMethodMeta = (key: string, target: object, propertyKey: string): unknown =>
  Reflect.getMetadata(key, resolveConstructor(target), propertyKey);

export const methodLabel = (key: string, label: string) =>
  methodMeta('label', (prev: Map<string, string> = new Map()) => prev.set(key, label));
export const getMethodLabels = (target: object, propertyKey: string): Map<string, string> =>
  (getMethodMeta('label', target, propertyKey) as Map<string, string> | undefined) ?? new Map();

export const methodTag = (tag: string) => methodMeta('tag', (prev: Set<string> = new Set()) => prev.add(tag));
export const getMethodTags = (target: object, propertyKey: string): Set<string> =>
  (getMethodMeta('tag', target, propertyKey) as Set<string> | undefined) ?? new Set();
