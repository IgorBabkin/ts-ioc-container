import { constructor, IInjector, IServiceLocator } from '../../lib';
import { inject as injectFn, InjectionDecorator, resolve } from 'ts-constructor-injector';
import { InjectorHook } from './InjectorHook';

export class IocInjector implements IInjector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {}

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: unknown[]): T {
        const it = resolve(locator)(value, ...deps);
        return this.hook.onConstruct(it);
    }
}

export const inject: InjectionDecorator<IServiceLocator> = injectFn;
