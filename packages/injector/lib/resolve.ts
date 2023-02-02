import { constructor, InjectFn } from './types';
import { attr, getProp } from './metadata';
import { constant, merge } from './utils';
import { Fn } from './pipe';

const INJECT_METADATA_KEY = 'INJECT_METADATA_FN';

export function resolve<Context>(context: Context) {
    return <T>(value: constructor<T>, ...deps: unknown[]) => {
        const injectionFns = getProp<InjectFn<Context>[]>(value, INJECT_METADATA_KEY) || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
        return new value(...args);
    };
}

export function inject<Context>(fn: Fn<Context, unknown>) {
    return attr(INJECT_METADATA_KEY)(fn);
}
