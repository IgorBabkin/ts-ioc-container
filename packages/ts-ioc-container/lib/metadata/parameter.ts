import { resolveConstructor } from './target';

export const addParamMeta =
  (key: string | symbol, mapFn: (prev: unknown) => unknown): ParameterDecorator =>
  (target, _, parameterIndex) => {
    const metadata: unknown[] = Reflect.getOwnMetadata(key, target) ?? [];
    metadata[parameterIndex] = mapFn(metadata[parameterIndex]);
    Reflect.defineMetadata(key, metadata, target);
  };
export const getParamMeta = (key: string | symbol, target: object): unknown[] => {
  return (Reflect.getOwnMetadata(key, resolveConstructor(target)) as unknown[]) ?? [];
};

export const addParamLabel = (key: string, label: string) =>
  addParamMeta('label', (prev: unknown) => {
    const map = (prev as Map<string, string> | undefined) ?? new Map<string, string>();
    return map.set(key, label);
  });
export const getParamLabels = (target: object, parameterIndex: number): Map<string, string> => {
  const all = getParamMeta('label', target);
  return (all[parameterIndex] as Map<string, string> | undefined) ?? new Map();
};

export const addParamTag = (tag: string) =>
  addParamMeta('tag', (prev: unknown) => {
    const set = (prev as Set<string> | undefined) ?? new Set<string>();
    return set.add(tag);
  });
export const getParamTags = (target: object, parameterIndex: number): Set<string> => {
  const all = getParamMeta('tag', target);
  return (all[parameterIndex] as Set<string> | undefined) ?? new Set();
};

/**
 * Applies several parameter decorators as one, so a stack repeated on many
 * parameters can be given a name:
 *
 * ```typescript
 * const fromConfig = <T>(key: string, map: MapFn<IConfig, T>) =>
 *   createComposeParameterDecorator(inject(pipe(by(ConfigToken), map)), addParamLabel('config', key));
 * ```
 *
 * Decorators are applied bottom-up, exactly as stacking them would be, so
 * `@createComposeParameterDecorator(a, b)` behaves like `@a @b`. A parameter
 * decorator returns nothing, so there is nothing to thread - each one is called
 * with the same target, property key and parameter index.
 */
export const createComposeParameterDecorator =
  (...decorators: ParameterDecorator[]): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    for (let i = decorators.length - 1; i >= 0; i--) {
      decorators[i](target, propertyKey, parameterIndex);
    }
  };
