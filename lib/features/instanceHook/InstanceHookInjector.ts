import { constructor, IInjector, IServiceLocator } from '../../index';
import { IInstanceHook } from './IInstanceHook';

export class InstanceHookInjector implements IInjector {
    private instances = new Set();
    constructor(private decorated: IInjector, private hook: IInstanceHook) {}

    dispose(): void {
        this.decorated.dispose();
        for (const i of this.instances) {
            this.hook.onDispose(i);
        }
        this.instances.clear();
    }

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const instance = this.decorated.resolve(locator, value, ...deps);
        this.hook.onConstruct(instance);
        this.instances.add(instance);
        return instance;
    }
}
