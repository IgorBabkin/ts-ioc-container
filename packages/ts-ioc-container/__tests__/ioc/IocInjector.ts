import { constructor, IInjector, IContainer } from '../../lib';
import { inject as injectFn, InjectionDecorator, resolve } from 'ts-constructor-injector';
import { InjectorHook } from './InjectorHook';

export class IocInjector implements IInjector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {}

    resolve<T>(locator: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        const it = resolve(locator)(value, ...deps);
        return this.hook.onConstruct(it);
    }
}

export const inject: InjectionDecorator<IContainer> = injectFn;
