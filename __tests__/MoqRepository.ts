import { IProviderRepository, MockRepository } from '../lib';
import { MoqProvider } from './MoqProvider';

export class MoqRepository extends MockRepository {
    protected createMockProvider<T>(): MoqProvider<T> {
        return new MoqProvider();
    }

    clone(parent: IProviderRepository = this): IProviderRepository {
        return new MoqRepository(this.decorated.clone(parent));
    }
}
