import { IResolvableHook } from './IResolvableHook';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constructor } from '../../helpers/types';

export class HookedInjector implements IInjector {
    private instances = new Set();

    constructor(private decorated: IInjector, private hook: IResolvableHook) {}

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...args: any[]): T {
        const instance = this.decorated.resolve(locator, value, ...args);
        this.hook.onResolve(instance);
        return instance;
    }

    dispose(): void {
        this.hook.onDispose();
        this.instances.clear();
    }

    clone(): IInjector {
        return new HookedInjector(this.decorated.clone(), this.hook);
    }
}
