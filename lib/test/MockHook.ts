import { IHook, IMockAdapter, ProviderKey } from '../index';
import { IMockRepository } from './IMockRepository';

export class MockHook<GMock> implements IHook {
    constructor(private decorated: IHook, private mocksRepo: IMockRepository<GMock>) {}

    fallbackResolve<GInstance>(key: ProviderKey, ...args: any[]): GInstance {
        return this.resolveMockAdapter<GInstance>(key, ...args).instance;
    }

    onContainerRemove(): void {
        this.decorated.onContainerRemove();
    }

    onInstanceCreate<GInstance>(instance: GInstance): void {
        this.decorated.onInstanceCreate(instance);
    }

    resolveMockAdapter<GInstance>(key: ProviderKey, ...args: any[]): IMockAdapter<GMock, GInstance> {
        return this.mocksRepo.findOrCreate<GInstance>(key, ...args);
    }
}
