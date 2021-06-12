import { ProviderKey } from '../provider/IProvider';

export interface IHook {
    onInstanceCreate<GInstance>(instance: GInstance): void;

    onContainerRemove(): void;

    onProviderResolved<GInstance>(instance: GInstance, key: ProviderKey, ...args: any[]): GInstance;

    clone(): IHook;
}
