import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor } from '../types';
import { Registration } from '../registration/Registration';

export type InjectionToken<T = unknown> = constructor<T> | ProviderKey;

export interface Resolveable {
    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T;
}

export interface IContainer extends Resolveable {
    createScope(tags?: Tag[]): IContainer;

    register(value: Registration): this;

    getProviders(): Map<ProviderKey, IProvider>;

    removeScope(child: IContainer): void;

    getInstances(): unknown[];

    dispose(): void;
}
