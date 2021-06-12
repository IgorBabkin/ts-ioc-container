import { ProviderKey } from '../provider/IProvider';

export interface IHook {
    onInstanceCreate<GInstance>(instance: GInstance): void;

    onContainerRemove(): void;

    fallbackResolve?: <GInstance>(key: ProviderKey, ...args: any[]) => GInstance;

    clone(): IHook;
}
