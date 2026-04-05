import { resolveConstructor } from '../utils/basic';

export const parameterMeta =
  (key: string | symbol, mapFn: (prev: unknown) => unknown): ParameterDecorator =>
  (target, _, parameterIndex) => {
    const metadata: unknown[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = mapFn(metadata[parameterIndex]);
    Reflect.defineMetadata(key, metadata, target);
  };
export const getParameterMeta = (key: string | symbol, target: object): unknown[] => {
  return (Reflect.getOwnMetadata(key, resolveConstructor(target)) as unknown[]) ?? [];
};

export const parameterLabel = (key: string, label: string) =>
  parameterMeta('label', (prev: unknown) => {
    const map = (prev as Map<string, string> | undefined) ?? new Map<string, string>();
    return map.set(key, label);
  });
export const getParameterLabels = (target: object, parameterIndex: number): Map<string, string> => {
  const all = getParameterMeta('label', target);
  return (all[parameterIndex] as Map<string, string> | undefined) ?? new Map();
};

export const parameterTag = (tag: string) =>
  parameterMeta('tag', (prev: unknown) => {
    const set = (prev as Set<string> | undefined) ?? new Set<string>();
    return set.add(tag);
  });
export const getParameterTags = (target: object, parameterIndex: number): Set<string> => {
  const all = getParameterMeta('tag', target);
  return (all[parameterIndex] as Set<string> | undefined) ?? new Set();
};
