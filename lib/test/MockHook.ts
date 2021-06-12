import { IHook, IMockAdapter, ProviderKey } from '../index';
import { IMockRepository } from './IMockRepository';

export class MockHook<GMock> implements IHook {
    constructor(private decorated: IHook, private mocksRepo: IMockRepository<GMock>) {}

    onDependencyNotFound<GInstance>(key: ProviderKey): GInstance {
        return this.resolveMockAdapter<GInstance>(key).instance;
    }

    onContainerRemove(): void {
        this.decorated.onContainerRemove();
    }

    onInstanceCreate<GInstance>(instance: GInstance): void {
        this.decorated.onInstanceCreate(instance);
    }

    resolveMockAdapter<GInstance>(key: ProviderKey): IMockAdapter<GMock, GInstance> {
        return this.mocksRepo.findOrCreate<GInstance>(key);
    }
}
