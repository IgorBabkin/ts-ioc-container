import { IProvider, ScopeOptions, Tag } from './provider/IProvider';
import { IDisposable } from '../helpers/types';
import { InjectionToken } from './IServiceLocator';

export type RegisterOptions = {
    noOverride: boolean;
};

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}

export interface IProviderRepository extends IDisposable, ScopeOptions {
    clone(tags?: Tag[], parent?: IProviderRepository): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>, options?: Partial<RegisterOptions>): void;

    entries(): Array<[ProviderKey, IProvider<any>]>;
}
