import { IInjector } from './IInjector';
import { IContainer, InjectionToken } from '../container/IContainer';
import { constant, constructor, merge } from '../utils';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

const attr =
    (key: string | symbol) =>
    (value: InjectFn): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        const metadata = Reflect.getOwnMetadata(key, target) ?? [];
        metadata[parameterIndex] = value;
        Reflect.defineMetadata(key, metadata, target);
    };

// eslint-disable-next-line @typescript-eslint/ban-types
function getProp<T>(target: Object, key: string | symbol): T | undefined {
    return Reflect.getOwnMetadata(key, target) as T;
}

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (c: IContainer) =>
        c.resolve<T>(key, ...args);

export const inject = attr('INJECT_FN_LIST');

export class ReflectionInjector implements IInjector {
    resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
        const injectionFns = getProp<InjectFn[]>(Target, 'INJECT_FN_LIST') || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(container));
        return new Target(...args);
    }
}
