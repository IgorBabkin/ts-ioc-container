import { IHook } from './IHook';
import { Fn } from '../helpers/types';
import { IInstanceHook } from './IInstanceHook';

export class Hook implements IHook {
    private disposeHooks: Fn[] = [];

    constructor(private hooks: IInstanceHook[] = []) {}

    onContainerRemove(): void {
        this.disposeHooks.forEach((h) => h());
    }

    onInstanceCreate<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onCreate(instance);
        }
        this.disposeHooks.push(() => this.onInstanceDispose(instance));
    }

    onInstanceDispose<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onDispose(instance);
        }
    }

    dispose(): void {
        this.disposeHooks = [];
    }

    clone(): Hook {
        return new Hook(this.hooks);
    }
}
