import { IHook } from './IHook';
import { Fn } from '../helpers/types';
import { IInstanceHook } from './IInstanceHook';
import { ProviderKey } from '../provider/IProvider';

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

    fallbackResolve<GInstance>(key: ProviderKey, args: any): GInstance {
        return undefined;
    }

    clone(): IHook {
        return new Hook(this.hooks);
    }
}
