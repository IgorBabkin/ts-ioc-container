import { IInjector } from './IInjector';
import { IContainer, InjectionToken } from '../container/IContainer';
import { constant, constructor, merge } from '../utils';
import { getProp } from '../reflection';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

const attr =
    (key: string | symbol) =>
    (value: InjectFn): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        const metadata = Reflect.getOwnMetadata(key, target) ?? [];
        metadata[parameterIndex] = value;
        Reflect.defineMetadata(key, metadata, target);
    };

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (c: IContainer) =>
        c.resolve<T>(key, ...args);

const METADATA_KEY = 'INJECT_FN_LIST';
export const inject = attr(METADATA_KEY);

export class ReflectionInjector implements IInjector {
    resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
        const injectionFns = getProp<InjectFn[]>(Target, METADATA_KEY) || [];
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(container));
        return new Target(...args);
    }
}
