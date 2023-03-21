import { constructor, IContainer, IInjector } from '../../lib';
import { InjectorHook } from './InjectorHook';

export class SimpleInjector implements IInjector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {}

    resolve<T>(locator: IContainer, value: constructor<T>, ...deps: any[]): T {
        return this.hook.onConstruct(new value(locator, ...deps));
    }

    clone(): IInjector {
        return new SimpleInjector(this.hook);
    }

    dispose(): void {}

    getInstances(): unknown[] {
        return [];
    }
}
