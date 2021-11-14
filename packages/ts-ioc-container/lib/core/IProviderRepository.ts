import { IKeyedProvider, ProviderKey, ScopeOptions, Tag } from './IProvider';
import { IDisposable } from '../helpers/types';
import { RegisterOptions } from './IServiceLocator';

export interface IProviderRepository extends IDisposable, ScopeOptions {
    clone(tags?: Tag[], parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IKeyedProvider<T>;

    add<T>(key: ProviderKey, provider: IKeyedProvider<T>, options?: Partial<RegisterOptions>): void;

    entries(): Array<[ProviderKey, IKeyedProvider<any>]>;
}
