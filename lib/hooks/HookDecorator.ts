import { IHook } from './IHook';
import { ProviderKey } from '../provider/IProvider';

export abstract class HookDecorator implements IHook {
    constructor(protected decorated: IHook) {}

    abstract clone(): IHook;

    onContainerRemove(): void {
        this.decorated.onContainerRemove();
    }

    onInstanceCreate<GInstance>(instance: GInstance): void {
        this.decorated.onInstanceCreate(instance);
    }

    onDependencyNotFound<GInstance>(key: ProviderKey, ...args: any[]): GInstance | undefined {
        return this.decorated.onDependencyNotFound(key, ...args);
    }
}
