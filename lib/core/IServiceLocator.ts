import { IProvider, ProviderKey } from './providers/IProvider';
import { constructor } from '../helpers/types';
import { IDisposable } from '../helpers/IDisposable';
import { IInjector } from './IInjector';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export type CreateInjectorFn = (l: IServiceLocator) => IInjector;
export type DecorateInjectorFn = (injector: IInjector) => IInjector;

export interface IServiceLocator extends IDisposable {
    createLocator(): IServiceLocator;

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;

    register<T>(key: ProviderKey, provider: IProvider<T>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    const tokenType = typeof token;
    return tokenType === 'string' || tokenType === 'symbol';
}
