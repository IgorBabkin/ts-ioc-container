import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor, Disposable } from '../utils/types';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IContainer extends Disposable, Resolveable {
    createScope(tags?: Tag[], parent?: IContainer): IContainer;

    register(provider: IProvider<unknown>): this;

    getProviders(): IProvider<unknown>[];

    removeScope(child: IContainer): void;

    getInstances(): unknown[];
}
