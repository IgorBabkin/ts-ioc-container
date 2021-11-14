import { MockProvider } from './MockProvider';
import { IMockProviderStorage } from './IMockProviderStorage';
import { ProviderKey } from '../../core/IProviderRepository';

export class MockProviderStorage implements IMockProviderStorage {
    private readonly mocks = new Map<ProviderKey, MockProvider<any>>();

    constructor(private readonly createMockProvider: <T>() => MockProvider<T>) {}

    dispose(): void {
        this.mocks.clear();
    }

    findOrCreate<T>(key: ProviderKey): MockProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createMockProvider());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.mocks.get(key) as MockProvider<T>;
    }
}
