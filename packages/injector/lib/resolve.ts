import { constructor, Fn, InjectFn } from './types';
import { attr, getProp } from './decorators';
import { constant, merge } from './utils';
import { pure, run } from './writeMonad';

const INJECT_METADATA_KEY = Symbol('inject');

export const resolve =
    <Context>(context: Context) =>
    <T>(value: constructor<T>, ...deps: unknown[]) => {
        const injectionFns = getProp<InjectFn<Context>[]>(value, INJECT_METADATA_KEY) || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
        return new value(...args);
    };

export const inject = <Context>(fn: Fn<Context, unknown>) =>
    attr(INJECT_METADATA_KEY)((context: Context) => {
        const monad = pure(context);
        const transformed = fn(monad);
        return run(transformed);
    });
