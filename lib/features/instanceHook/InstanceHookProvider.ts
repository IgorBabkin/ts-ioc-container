import { IProvider } from '../../core/providers/IProvider';
import { IInstanceHook } from './IInstanceHook';
import { IServiceLocator } from '../../core/IServiceLocator';

export class InstanceHookProvider<GInstance> implements IProvider<GInstance> {
    private instances = new Set<GInstance>();

    constructor(private decorated: IProvider<GInstance>, private hook: IInstanceHook) {}

    dispose(): void {
        this.decorated.dispose();
        this.onDispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): GInstance {
        const instance = this.decorated.resolve(locator, ...args);
        this.onResolve(instance);
        return instance;
    }

    clone(): InstanceHookProvider<GInstance> | undefined {
        const cloned = this.decorated.clone();
        return cloned ? new InstanceHookProvider(cloned, this.hook) : undefined;
    }

    protected onDispose(): void {
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
