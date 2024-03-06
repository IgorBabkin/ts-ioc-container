import { constructor, InjectFn } from './types';
import { constant, merge } from './utils';

const INJECT_METADATA_KEY = 'INJECT_METADATA_FN';

export function resolve<Context>(context: Context) {
  return <T>(Target: constructor<T>, ...deps: unknown[]) => {
    const injectionFns: InjectFn<Context>[] = Reflect.getOwnMetadata(INJECT_METADATA_KEY, Target) ?? [];
    const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
    return new Target(...args);
  };
}

export const inject =
  <T>(value: T): ParameterDecorator =>
  (Target, propertyKey, parameterIndex) => {
    const metadata = Reflect.getOwnMetadata(INJECT_METADATA_KEY, Target) ?? [];
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(INJECT_METADATA_KEY, metadata, Target);
  };
