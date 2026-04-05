import { resolveConstructor } from '../utils/basic';

export const paramMeta =
  (key: string | symbol, mapFn: (prev: unknown) => unknown): ParameterDecorator =>
  (target, _, parameterIndex) => {
    const metadata: unknown[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = mapFn(metadata[parameterIndex]);
    Reflect.defineMetadata(key, metadata, target);
  };
export const getParamMeta = (key: string | symbol, target: object): unknown[] => {
  return (Reflect.getOwnMetadata(key, resolveConstructor(target)) as unknown[]) ?? [];
};

export const paramLabel = (key: string, label: string) =>
  paramMeta('label', (prev: unknown) => {
    const map = (prev as Map<string, string> | undefined) ?? new Map<string, string>();
    return map.set(key, label);
  });
export const getParamLabels = (target: object, parameterIndex: number): Map<string, string> => {
  const all = getParamMeta('label', target);
  return (all[parameterIndex] as Map<string, string> | undefined) ?? new Map();
};

export const paramTag = (tag: string) =>
  paramMeta('tag', (prev: unknown) => {
    const set = (prev as Set<string> | undefined) ?? new Set<string>();
    return set.add(tag);
  });
export const getParamTags = (target: object, parameterIndex: number): Set<string> => {
  const all = getParamMeta('tag', target);
  return (all[parameterIndex] as Set<string> | undefined) ?? new Set();
};
