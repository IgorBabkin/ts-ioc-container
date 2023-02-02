import { IProvider, ProviderKey, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';
import { IInstanceHook } from './IInstanceHook';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IServiceLocator extends IDisposable, Resolveable {
    createScope(tags?: Tag[], parent?: IServiceLocator): IServiceLocator;

    register(key: ProviderKey, provider: IProvider<unknown>): void;

    entries(): Array<[ProviderKey, IProvider<any>]>;

    setHook(hook: IInstanceHook): this;
}
