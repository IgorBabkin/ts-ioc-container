import { constructor, IContainer, IInjector, Injector } from '../../lib';
import { InjectorHook } from './InjectorHook';

export class SimpleInjector extends Injector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {
        super();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        return this.hook.onConstruct(new value(container, ...args));
    }

    clone(): IInjector {
        return new SimpleInjector(this.hook);
    }
}
