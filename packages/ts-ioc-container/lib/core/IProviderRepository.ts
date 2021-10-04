import { IProvider, ProviderKey } from './IProvider';
import { IDisposable } from '../helpers/IDisposable';

export interface IProviderRepository extends IDisposable {
    clone(name?: string, parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;
}
