import { IMockAdapter, ProviderKey } from '../index';
import { IMockRepository } from './IMockRepository';

export abstract class MockRepository<GMock> implements IMockRepository<GMock> {
    private mocks = new Map<ProviderKey, IMockAdapter<GMock, any>>();

    findOrCreate<GInstance>(key: ProviderKey): IMockAdapter<GMock, GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createMock<GInstance>());
        }

        return this.mocks.get(key);
    }

    protected abstract createMock<TInstance>(): IMockAdapter<GMock, TInstance>;
}
