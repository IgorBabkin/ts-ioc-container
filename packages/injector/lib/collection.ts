import { constructor } from './types';
import { getProp, prop } from './reflection';
import { resolve } from './resolve';
import { constant } from './utils';
import { Write } from './pipeWrite';

type Predicate<T> = (value: T) => boolean;

const INJECT_CONTEXT_PREDICATE_METADATA_KEY = Symbol('inject-context-predicate');
export const matchContext = <T>(fn: Predicate<T>) => prop(INJECT_CONTEXT_PREDICATE_METADATA_KEY, fn);
const getContextPredicate = <Context>(A: constructor<unknown>) =>
  getProp<Predicate<Context>>(A, INJECT_CONTEXT_PREDICATE_METADATA_KEY) ?? constant(true);

export const to =
  <T>(...values: constructor<T>[]) =>
  <Context>(context: Context) => {
    if (context === undefined) {
      return undefined;
    }
    const value = values.find((v) => getContextPredicate(v)(context));
    return value ? resolve(context)(value) : undefined;
  };

export const toWrite =
  <T>(...values: constructor<T>[]) =>
  <Context>([context, logs]: Write<Context>): Write<T | undefined> =>
    [to(...values)(context), logs.concat('toWrite')];
