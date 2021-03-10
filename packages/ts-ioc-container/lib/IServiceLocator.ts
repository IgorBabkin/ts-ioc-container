import { IProvider, ProviderKey } from './provider/IProvider';
import { constructor } from './helpers/types';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface IServiceLocator {
    createContainer(): IServiceLocator;

    remove(): void;

    resolve<T>(c: InjectionToken<T>, ...deps: any[]): T;

    register<T>(key: ProviderKey, registration: IProvider<T>): this;
}

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    const tokenType = typeof token;
    return tokenType === 'string' || tokenType === 'symbol';
}
