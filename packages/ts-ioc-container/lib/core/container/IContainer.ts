import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor, IDisposable } from '../utils/types';
import { IContainerHook } from './IContainerHook';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IContainer extends IDisposable, Resolveable {
    createScope(tags?: Tag[], parent?: IContainer): IContainer;

    register(provider: IProvider<unknown>): this;

    getProviders(): IProvider<unknown>[];

    setHook(hook: IContainerHook): this;
}
