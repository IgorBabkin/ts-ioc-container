import { constructor, InjectFn, MapFn } from './types';
import { attr, getProp, prop } from './metadata';
import { constant, id, merge } from './utils';
import { Fn } from './pipe';

const INJECT_METADATA_KEY = Symbol('inject');
const INJECT_CONTEXT_MAPPER_METADATA_KEY = Symbol('inject-context-mapper');

const resolveBase =
    <Context>(context: Context) =>
    <T>(value: constructor<T>, ...deps: unknown[]) => {
        const injectionFns = getProp<InjectFn<Context>[]>(value, INJECT_METADATA_KEY) || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
        return new value(...args);
    };

export function resolve<Context>(context: Context) {
    return <T>(value: constructor<T>, ...deps: unknown[]) => {
        const mapContext = getProp<MapFn<Context, unknown>>(value, INJECT_CONTEXT_MAPPER_METADATA_KEY) ?? id;
        return resolveBase(mapContext(context))(value, ...deps);
    };
}

export function inject<Context>(fn: Fn<Context, unknown>) {
    return attr(INJECT_METADATA_KEY)(fn);
}

export function mapContext<Context>(value: MapFn<Context, unknown>) {
    return prop(INJECT_CONTEXT_MAPPER_METADATA_KEY, value);
}
