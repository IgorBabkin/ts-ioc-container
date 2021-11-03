import { IProvider, ProviderKey, Tag } from './IProvider';
import { constructor, IDisposable } from '../helpers/types';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
}

export interface IServiceLocator extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IServiceLocator;

    register(dictionary: Record<ProviderKey, IProvider<unknown>>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
