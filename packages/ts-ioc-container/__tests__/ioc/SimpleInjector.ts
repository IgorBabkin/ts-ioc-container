import { constructor, IInjector, IContainer } from '../../lib';
import { InjectorHook } from './InjectorHook';

export class SimpleInjector implements IInjector {
    constructor(private hook: InjectorHook = { onConstruct: (v) => v }) {}

    resolve<T>(locator: IContainer, value: constructor<T>, ...deps: any[]): T {
        return this.hook.onConstruct(new value(locator, ...deps));
    }
}
