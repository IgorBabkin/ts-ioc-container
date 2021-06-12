import { IHook } from './IHook';
import { Fn } from '../helpers/types';
import { IInstanceHook } from './IInstanceHook';

export class Hook implements IHook {
    private disposeHooks: Fn[] = [];

    constructor(private hooks: IInstanceHook[] = []) {}

    onInstanceCreate<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onCreate(instance);
        }
        this.disposeHooks.push(() => this.onInstanceDispose(instance));
    }

    private onInstanceDispose<GInstance>(instance: GInstance): void {
        for (const hook of this.hooks) {
            hook.onDispose(instance);
        }
    }

    onContainerRemove(): void {
        this.disposeHooks.forEach((h) => h());
        this.disposeHooks = [];
    }
}
