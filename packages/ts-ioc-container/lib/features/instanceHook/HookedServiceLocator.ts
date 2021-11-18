import { Tag } from '../../core/provider/IProvider';
import { InjectionToken, IServiceLocator } from '../../core/IServiceLocator';
import { IInstanceHook } from './IInstanceHook';
import { ServiceLocatorDecorator } from '../../core/ServiceLocatorDecorator';

export class HookedServiceLocator extends ServiceLocatorDecorator {
    private instances = new Set();

    constructor(private locator: IServiceLocator, private hook: IInstanceHook) {
        super(locator);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        const instance = this.locator.resolve(key, ...args);
        if (!this.instances.has(instance)) {
            this.hook.onConstruct(instance);
            this.instances.add(instance);
        }
        return instance;
    }

    createScope(tags?: Tag[]): IServiceLocator {
        return new HookedServiceLocator(this.locator.createScope(tags, this), this.hook);
    }

    dispose(): void {
        this.locator.dispose();
        for (const i of this.instances) {
            this.hook.onDispose(i);
        }
        this.instances.clear();
    }
}
