import { IProviderRepository, MockRepository, ProviderKey } from '../lib';
import { MoqProvider } from './MoqProvider';
import { IMock } from 'moq.ts';

export class MoqRepository extends MockRepository {
    findMock<T>(key: ProviderKey): IMock<T> {
        return (this.findOrCreateProvider<T>(key) as MoqProvider<T>).getMock();
    }

    protected createMockProvider<T>(): MoqProvider<T> {
        return new MoqProvider();
    }

    clone(parent: IProviderRepository = this): IProviderRepository {
        return new MoqRepository(this.decorated.clone(parent));
    }
}
