import { IKeyedProvider, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';
import { ProviderKey, RegisterOptions } from './IProviderRepository';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
}

export interface IServiceLocator extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IServiceLocator;

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this;

    resolveClass<T>(key: constructor<T>, ...deps: any[]): T;
}
