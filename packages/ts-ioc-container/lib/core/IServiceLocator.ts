import { IProvider, ProviderKey } from './IProvider';
import { constructor } from '../helpers/types';
import { IDisposable } from '../helpers/IDisposable';
import { IInjector } from './IInjector';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;
export type CreateInjectorFn = (l: IServiceLocator) => IInjector;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
}

export interface IServiceLocator extends Resolveable, IDisposable {
    createLocator(tags?: string[]): IServiceLocator;

    register<T>(key: ProviderKey, provider: IProvider<T>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
