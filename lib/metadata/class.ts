import { resolveConstructor } from '../utils/basic';

export const classMetadata =
  <T>(key: string | symbol, mapFn: (prev: T | undefined) => T): ClassDecorator =>
  (target) => {
    const value: T | undefined = Reflect.getOwnMetadata(key, target);
    Reflect.defineMetadata(key, mapFn(value), target);
  };

export function getClassMetadata<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, resolveConstructor(target));
}

export const classLabel = (key: string, label: string) =>
  classMetadata('label', (prev: Map<string, string> = new Map()) => prev.set(key, label));
export const getClassLabels = (target: object): Map<string, string> => getClassMetadata(target, 'label') ?? new Map();

export const classTag = (tag: string) => classMetadata('tag', (prev: Set<string> = new Set()) => prev.add(tag));
export const getClassTags = (target: object): Set<string> => getClassMetadata(target, 'tag') ?? new Set();
