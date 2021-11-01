import { IProvider, ProviderKey, Tag } from './IProvider';
import { IDisposable } from '../helpers/types';

export interface IProviderRepository extends IDisposable {
    clone(tags?: Tag[], parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;
}
