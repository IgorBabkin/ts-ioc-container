import { IProvider, ProviderKey } from './providers/IProvider';
import { IDisposable } from '../helpers/IDisposable';

export interface IProviderRepository extends IDisposable {
    clone(parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;
}
