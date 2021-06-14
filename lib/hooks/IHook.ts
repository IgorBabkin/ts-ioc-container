import { ProviderKey } from '../provider/IProvider';

export interface IHook {
    onInstanceCreated?: <GInstance>(instance: GInstance) => void;

    onLocatorRemoved?: () => void;

    onDependencyNotFound?: <GInstance>(key: ProviderKey, ...args: any[]) => GInstance | undefined;
}
