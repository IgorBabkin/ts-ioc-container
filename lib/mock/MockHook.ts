import { EmptyHook, IHook, IMockAdapter, ProviderKey } from '../index';
import { IMockRepository } from './IMockRepository';
import { HookDecorator } from '../hooks/HookDecorator';

export class MockHook<GMock> extends HookDecorator {
    constructor(private mocksRepo: IMockRepository<GMock>, decorated: IHook = new EmptyHook()) {
        super(decorated);
    }

    resolveMockAdapter<GInstance>(key: ProviderKey, ...args: any[]): IMockAdapter<GMock, GInstance> {
        return this.mocksRepo.findOrCreate<GInstance>(key, ...args);
    }

    clone(): MockHook<GMock> {
        return new MockHook(this.mocksRepo, this.decorated.clone());
    }

    onProviderResolved<GInstance>(instance: GInstance, key: ProviderKey, ...args: any[]): GInstance {
        return (
            this.decorated.onProviderResolved(instance, key, ...args) ||
            this.resolveMockAdapter<GInstance>(key, ...args).instance
        );
    }
}
