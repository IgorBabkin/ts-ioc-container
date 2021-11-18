import { IResolvableHook } from './IResolvableHook';
import { Resolveable } from '../../core/IServiceLocator';
import { ProviderDecorator } from '../../core/provider/ProviderDecorator';
import { IKeyedProvider } from '../../core/provider/IProvider';

export class HookedProvider<GInstance> extends ProviderDecorator<GInstance> {
    constructor(private readonly provider: IKeyedProvider<GInstance>, private readonly hook: IResolvableHook) {
        super(provider);
    }

    resolve(locator: Resolveable, ...args: any[]): GInstance {
        const instance = this.provider.resolve(locator, ...args);
        this.hook.onResolve(instance);
        return instance;
    }

    clone(): HookedProvider<GInstance> {
        return new HookedProvider(this.provider.clone(), this.hook);
    }

    dispose(): void {
        this.provider.dispose();
        this.hook.onDispose();
    }
}
