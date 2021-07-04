import { IProvider } from '../../core/providers/IProvider';
import { HookedProvider } from './HookedProvider';
import { IInstanceHook } from './IInstanceHook';

export class InstanceHookProvider<GInstance> extends HookedProvider<GInstance> {
    private instances = new Set<GInstance>();
    canBeCloned = true;

    constructor(decorated: IProvider<GInstance>, private hook: IInstanceHook) {
        super(decorated);
    }

    clone(): HookedProvider<GInstance> {
        return new InstanceHookProvider(this.decorated.clone(), this.hook);
    }

    protected override onDispose(): void {
        for (const instance of this.instances) {
            this.hook.onDispose(instance);
        }
    }

    protected onResolve(instance: GInstance): void {
        if (this.instances.has(instance)) {
            return;
        }

        this.instances.add(instance);
        this.hook.onConstruct(instance);
    }
}
