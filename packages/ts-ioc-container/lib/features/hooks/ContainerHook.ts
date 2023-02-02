import { IContainerHook } from '../../core/container/IContainerHook';
import { noop } from '../../core/utils/others';

export type OnDisposeHook = (instance: unknown) => void;

export class ContainerHook implements IContainerHook {
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

    clone(): IContainerHook {
        return new ContainerHook(this.onDisposeFn);
    }
}
