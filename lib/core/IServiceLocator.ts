import { IProvider, ProviderKey } from './providers/IProvider';
import { constructor } from '../helpers/types';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface IServiceLocator {
    createLocator(): IServiceLocator;

    remove(): void;

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;

    register<T>(key: ProviderKey, provider: IProvider<T>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    const tokenType = typeof token;
    return tokenType === 'string' || tokenType === 'symbol';
}
