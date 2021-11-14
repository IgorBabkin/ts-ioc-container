import { InjectionToken, IServiceLocator } from '../../core/IServiceLocator';
import { IKeyedProvider, Tag } from '../../core/provider/IProvider';
import { RegisterOptions } from '../../core/IProviderRepository';
import { constructor } from '../../helpers/types';
import { IInstanceHook } from './IInstanceHook';
import { HookedProvider } from './HookedProvider';

export class HookedServiceLocator implements IServiceLocator {
    private readonly instances = new Set();

    constructor(private readonly decorated: IServiceLocator, private hook: IInstanceHook) {}

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this {
        this.decorated.register(new HookedProvider(provider, this.hook), options);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return this.decorated.resolve<T>(key, ...args);
    }

    resolveClass<T>(key: constructor<T>, ...args: any[]): T {
        const instance = this.decorated.resolve<T>(key, ...args);
        this.hook.onConstruct(instance);
        this.instances.add(instance);
        return instance;
    }

    createScope(tags?: Tag[]): IServiceLocator {
        return new HookedServiceLocator(this.decorated.createScope(tags), this.hook);
    }

    dispose(): void {
        this.decorated.dispose();
        for (const i of this.instances) {
            this.hook.onDispose(i);
        }
        this.instances.clear();
        this.decorated.dispose();
    }
}
