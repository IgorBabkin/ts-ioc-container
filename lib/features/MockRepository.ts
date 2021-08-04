import {IProvider, IProviderRepository, ProviderKey, ProviderNotFoundError} from '../index';

export abstract class MockRepository implements IProviderRepository {
    private mocks = new Map<ProviderKey, IProvider<any>>();

    constructor(protected decorated: IProviderRepository) {}

    dispose(): void {
        this.decorated.dispose();
        this.mocks.clear();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.findOrCreateProvider(key);
            }

            throw e;
        }
    }

    protected findOrCreateProvider<T>(key: ProviderKey): IProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createMockProvider<T>());
        }

        return this.mocks.get(key) as IProvider<T>;
    }

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.decorated.add(key, provider);
    }

    protected abstract createMockProvider<T>(): IProvider<T>;

    abstract clone(parent?: IProviderRepository): IProviderRepository;
}
