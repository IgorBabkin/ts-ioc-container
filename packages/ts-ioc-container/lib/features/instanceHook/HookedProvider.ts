import { IInstanceHook } from './IInstanceHook';
import { IServiceLocator } from '../../core/IServiceLocator';
import { ProviderDecorator } from '../../core/provider/ProviderDecorator';
import { IKeyedProvider } from '../../core/provider/IProvider';

export class HookedProvider<GInstance> extends ProviderDecorator<GInstance> {
    private readonly instances = new Set<GInstance>();

    constructor(private readonly provider: IKeyedProvider<GInstance>, private readonly hook: IInstanceHook) {
        super(provider);
    }

    dispose(): void {
        this.provider.dispose();
        for (const instance of this.instances) {
            this.hook.onDispose(instance);
        }
        this.instances.clear();
    }

    resolve(locator: IServiceLocator, ...args: any[]): GInstance {
        const instance = this.provider.resolve(locator, ...args);
        if (!this.instances.has(instance)) {
            this.hook.onConstruct(instance);
            this.instances.add(instance);
        }
        return instance;
    }

    clone(): HookedProvider<GInstance> {
        return new HookedProvider(this.provider.clone(), this.hook);
    }
}
