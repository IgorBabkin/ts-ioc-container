import { constructor, IContainer, IInjector, Injector } from '../../lib';
import { inject as injectFn, InjectionDecorator, resolve } from 'ts-constructor-injector';
import { InjectorHook } from './InjectorHook';

export class IocInjector extends Injector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {
        super();
    }

    clone(): IInjector {
        return new IocInjector(this.hook);
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T {
        const instance = resolve(container)(value, ...deps);
        this.hook.onConstruct(instance);
        return instance;
    }
}

export const inject: InjectionDecorator<IContainer> = injectFn;
