import { IProvider, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';

export type RegisterOptions = {
    noOverride: boolean;
};
export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IServiceLocator extends IDisposable, Resolveable {
    createScope(tags?: Tag[], parent?: IServiceLocator): IServiceLocator;

    register(key: ProviderKey, provider: IProvider<unknown>, options?: Partial<RegisterOptions>): void;

    entries(): Array<[ProviderKey, IProvider<any>]>;
}
