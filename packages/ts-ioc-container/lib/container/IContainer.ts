import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor } from '../types';
import { Registration } from '../registration/Registration';

export type InjectionToken<T = unknown> = constructor<T> | ProviderKey;

export interface Resolvable {
    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T;
}

export interface IContainer extends Resolvable {
    createScope(tags?: Tag[]): IContainer;

    register(value: Registration): this;

    getProviders(): Map<ProviderKey, IProvider>;

    removeScope(child: IContainer): void;

    getInstances(): unknown[];

    dispose(): void;
}
