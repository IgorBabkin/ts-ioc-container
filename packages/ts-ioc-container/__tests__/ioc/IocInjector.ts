import { constructor, IInjector, IServiceLocator } from '../../lib';
import { Fn, inject as injectFn, InjectionDecorator, resolve } from 'ts-constructor-injector';

export class IocInjector implements IInjector {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(locator)(value, ...deps);
    }
}

export const inject: InjectionDecorator<IServiceLocator> = injectFn;

export const withoutLogs =
    <Context, T>(fn: (value: Context) => T): Fn<Context, T> =>
    ([c, l]) =>
        [fn(c), l];
