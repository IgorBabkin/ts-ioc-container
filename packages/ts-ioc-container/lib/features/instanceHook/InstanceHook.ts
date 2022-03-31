import { IInstanceHook } from '../../core/IInstanceHook';
import { noop } from '../../helpers/utils';

export type OnDisposeHook = (instance: unknown) => void;

export class InstanceHook implements IInstanceHook {
    private instances = new Set();

    constructor(private onDisposeFn: OnDisposeHook = noop) {}

    onDispose(hook: OnDisposeHook): void {
        this.onDisposeFn = hook;
    }

    resolve<T>(instance: T): T {
        this.instances.add(instance);
        return instance;
    }

    dispose(): void {
        for (const it of this.instances) {
            this.onDisposeFn(it);
        }
        this.instances.clear();
    }

    clone(): IInstanceHook {
        return new InstanceHook(this.onDisposeFn);
    }
}
