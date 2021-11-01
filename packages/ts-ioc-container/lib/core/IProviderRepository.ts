import { IProvider, ProviderKey, ScopeOptions, Tag } from './IProvider';
import { IDisposable } from '../helpers/types';

export interface IProviderRepository extends IDisposable, ScopeOptions {
    clone(tags?: Tag[], parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;

    entries(): Array<[ProviderKey, IProvider<any>]>;
}
