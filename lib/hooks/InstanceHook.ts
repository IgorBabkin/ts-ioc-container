import { IHook } from './IHook';
import { IInstanceHook } from './IInstanceHook';

export class InstanceHook implements IHook {
    private instances: any[] = [];

    constructor(private hooks: IInstanceHook[] = []) {}

    onInstanceCreate<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onCreate(instance);
        }
        this.instances.push(instance);
    }

    private onInstanceDispose<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onDispose(instance);
        }
    }

    onContainerRemove(): void {
        this.instances.forEach((i) => this.onInstanceDispose(i));
        this.instances = [];
    }
}
