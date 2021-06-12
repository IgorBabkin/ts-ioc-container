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

    onProviderResolved<GInstance>(instance: GInstance, key: ProviderKey, ...args: any[]): GInstance {
        return this.decorated.onProviderResolved(instance, key, ...args);
    }
}
