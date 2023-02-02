import { IProvider, ProviderKey, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';
import { IInstanceHook } from './IInstanceHook';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IContainer extends IDisposable, Resolveable {
    createScope(tags?: Tag[], parent?: IContainer): IContainer;

    register(provider: IProvider<unknown>): void;

    getProviders(): IProvider<unknown>[];

    setHook(hook: IInstanceHook): this;
}
