import { constructor } from '../../helpers/types';
import { InjectionToken, IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constant, merge } from '../../helpers/utils';
import { InjectFn } from './InjectFn';

const METADATA_KEY = Symbol.for('IocInjector');

function getInjectionFns<T>(target: T): InjectFn<unknown>[] {
    return Reflect.getOwnMetadata(METADATA_KEY, target) ?? [];
}

// eslint-disable-next-line @typescript-eslint/ban-types
function addMetadata<T>(target: T, parameterIndex: number, injectionFn: InjectFn<unknown>): void {
    const metadata = getInjectionFns(target);
    metadata[parameterIndex] = injectionFn;
    Reflect.defineMetadata(METADATA_KEY, metadata, target);
}

export class IocInjector implements IInjector {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: unknown[]): T {
        const injectionFns = getInjectionFns(value);
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(locator));
        return new value(...args);
    }
}

export const injectFn =
    <T>(injectionFn: InjectFn<T>): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        addMetadata(target, parameterIndex, injectionFn);
    };

export const inject = <T>(token: InjectionToken<T>, ...args: unknown[]): ParameterDecorator =>
    injectFn((l) => l.resolve(token, ...args));
