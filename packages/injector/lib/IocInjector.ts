import { constructor } from './types';
import { attr, getProp } from './decorators';
import { IInjector, InjectFn } from './IInjector';
import { constant, merge } from './utils';

const INJECT_METADATA_KEY = Symbol('inject');

export class IocInjector<Context> implements IInjector<Context> {
    resolve<T>(context: Context, value: constructor<T>, ...deps: unknown[]): T {
        const injectionFns = getProp<InjectFn<Context>[]>(value, INJECT_METADATA_KEY);
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(context));
        return new value(...args);
    }
}

export type InjectionDecorator<Context> = (fn: InjectFn<Context>) => ParameterDecorator;
export const injectFn = attr(INJECT_METADATA_KEY);
