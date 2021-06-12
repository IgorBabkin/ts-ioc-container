import { Fn } from '../helpers/types';
import { IHook } from './IHook';
import { IInstanceHook } from './IInstanceHook';
import { HookDecorator } from './HookDecorator';
import { EmptyHook } from './EmptyHook';

export class InstanceHook extends HookDecorator {
    private disposeHooks: Fn[] = [];

    constructor(private hooks: IInstanceHook[] = [], decorated: IHook = new EmptyHook()) {
        super(decorated);
    }

    onInstanceCreate<GInstance>(instance: GInstance): void {
        this.decorated.onInstanceCreate(instance);
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
        this.decorated.onContainerRemove();
        this.disposeHooks.forEach((h) => h());
        this.disposeHooks = [];
    }

    clone(): IHook {
        return new InstanceHook(this.hooks, this.decorated.clone());
    }
}
