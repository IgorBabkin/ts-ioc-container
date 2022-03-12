import { constructor, InjectFn } from './types';
import { attr, field, getFieldProps, getProp } from './metadata';
import { constant, merge } from './utils';
import { Fn } from './pipe';

const INJECT_METADATA_KEY = Symbol('inject');
const INJECT_PROPERTY_METADATA_KEY = Symbol('injectProperty');

export const resolve =
    <Context>(context: Context) =>
    <T>(value: constructor<T>, ...deps: unknown[]) => {
        const injectionFns = getProp<InjectFn<Context>[]>(value, INJECT_METADATA_KEY) || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
        const instance = new value(...args);

        const propertyFns =
            getFieldProps<Map<string | symbol, InjectFn<Context>>>(instance, INJECT_PROPERTY_METADATA_KEY) ?? new Map();
        for (const [key, fn] of propertyFns.entries()) {
            instance[key] = fn(context);
        }

        return instance;
    };

export const inject = <Context>(fn: Fn<Context, unknown>) => attr(INJECT_METADATA_KEY)(fn);
export const injectProperty = <Context>(fn: Fn<Context, unknown>) => field(INJECT_PROPERTY_METADATA_KEY, fn);
