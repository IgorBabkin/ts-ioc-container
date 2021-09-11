import { MockProvider } from './MockProvider';
import { ProviderKey } from '../../core/providers/IProvider';
import { MoqProvider } from '../../../__tests__/MoqProviderStorage';

export class MockProviderStorage {
    private readonly mocks = new Map<ProviderKey, MockProvider<any>>();

    constructor(private readonly createValue: <T>() => MoqProvider<T>) {}

    dispose(): void {
        this.mocks.clear();
    }

    findOrCreate<T>(key: ProviderKey): MockProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createValue());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.mocks.get(key) as MockProvider<T>;
    }
}
