import { type constructor } from '../utils/basic';

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
