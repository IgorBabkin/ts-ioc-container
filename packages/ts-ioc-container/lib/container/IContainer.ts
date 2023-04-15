import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor, Disposable } from '../utils/types';
import { Registration } from '../registration/Registration';

export type InjectionToken<T = any> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: any[]): T;
}

export interface IContainer extends Disposable, Resolveable {
    createScope(tags?: Tag[]): IContainer;

    register(value: Registration<unknown>): this;

    getProviders(): Map<ProviderKey, IProvider<unknown>>;

    removeScope(child: IContainer): void;

    getInstances(): unknown[];
}
