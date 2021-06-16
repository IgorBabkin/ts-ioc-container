import { ProviderKey } from '../lib';
import { IMock, Mock } from 'moq.ts';

export class MockRepository {
    private mocks = new Map<ProviderKey, IMock<any>>();

    findOrCreate<GInstance>(key: ProviderKey): IMock<GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, new Mock<GInstance>());
        }

        return this.mocks.get(key) as IMock<GInstance>;
    }
}
