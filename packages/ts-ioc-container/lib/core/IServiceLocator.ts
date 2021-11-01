import { IProvider, ProviderKey, Tag } from './IProvider';
import { constructor, IDisposable } from '../helpers/types';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
}

export interface IServiceLocator extends Resolveable, IDisposable {
    createLocator(tags?: Tag[]): IServiceLocator;

    register<T>(key: ProviderKey, provider: IProvider<T>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
