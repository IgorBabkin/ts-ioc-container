import { resolveConstructor } from '../utils/basic';

export const classMeta =
  <T>(key: string | symbol, mapFn: (prev: T | undefined) => T): ClassDecorator =>
  (target) => {
    const value: T | undefined = Reflect.getOwnMetadata(key, target);
    Reflect.defineMetadata(key, mapFn(value), target);
  };

export function getClassMeta<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, resolveConstructor(target));
}

export const classLabel = (key: string, label: string) =>
  classMeta('label', (prev: Map<string, string> = new Map()) => prev.set(key, label));
export const getClassLabels = (target: object): Map<string, string> => getClassMeta(target, 'label') ?? new Map();

export const classTag = (tag: string) => classMeta('tag', (prev: Set<string> = new Set()) => prev.add(tag));
export const getClassTags = (target: object): Set<string> => getClassMeta(target, 'tag') ?? new Set();
