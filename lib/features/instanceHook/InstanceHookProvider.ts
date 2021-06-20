import { IProviderOptions, ProviderFn } from '../../core/IProvider';
import { HookedProvider } from './HookedProvider';
import { IInstanceHook } from './IInstanceHook';
import { Provider } from '../../core/Provider';

export class InstanceHookProvider<GInstance> extends HookedProvider<GInstance> {
    private instances = new Set<GInstance>();

    constructor(private fn: ProviderFn<GInstance>, private options: IProviderOptions, private hook: IInstanceHook) {
        super(
            new Provider((l, ...args) => {
                const instance = fn(l, ...args);
                this.onConstruct(instance);
                return instance;
            }, options),
        );
    }

    clone(options?: Partial<IProviderOptions>): HookedProvider<GInstance> {
        return new InstanceHookProvider(this.fn, { ...this.options, ...options }, this.hook);
    }

    protected override onDispose(): void {
        for (const instance of this.instances) {
            this.hook.onDispose(instance);
        }
    }

    private onConstruct(instance: GInstance): void {
        this.instances.add(instance);
        this.hook.onConstruct(instance);
    }
}
