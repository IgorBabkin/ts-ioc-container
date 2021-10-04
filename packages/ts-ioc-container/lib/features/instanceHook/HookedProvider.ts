import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IInstanceHook } from './IInstanceHook';
import { IServiceLocator } from '../../core/IServiceLocator';

export class HookedProvider<GInstance> implements IProvider<GInstance> {
    private readonly instances = new Set<GInstance>();

    constructor(private readonly decorated: IProvider<GInstance>, private readonly hook: IInstanceHook) {}

    dispose(): void {
        this.decorated.dispose();
        for (const instance of this.instances) {
            this.hook.onDispose(instance);
        }
        this.instances.clear();
    }

    resolve(locator: IServiceLocator, ...args: any[]): GInstance {
        const instance = this.decorated.resolve(locator, ...args);
        this.hook.onConstruct(instance);
        this.instances.add(instance);
        return instance;
    }

    clone(): HookedProvider<GInstance> {
        return new HookedProvider(this.decorated.clone(), this.hook);
    }

    isValid(filters: ScopeOptions): boolean {
        return this.decorated.isValid(filters);
    }
}
