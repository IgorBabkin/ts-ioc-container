import { IKeyedProvider, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';
import { ProviderKey, RegisterOptions } from './IProviderRepository';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolveByKey<T>(key: ProviderKey, ...args: any[]): T;

    resolveClass<T>(key: constructor<T>, ...args: any[]): T;
}

export interface IServiceLocator extends IDisposable {
    createScope(tags?: Tag[]): IServiceLocator;

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this;

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}
