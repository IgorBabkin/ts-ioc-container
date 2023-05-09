import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { constructor } from '../types';
import { IRegistration } from '../registration/IRegistration';

export type InjectionToken<T = unknown> = constructor<T> | ProviderKey;

export interface Resolvable {
    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T;
}

export interface IContainer extends Resolvable {
    createScope(tags?: Tag[]): IContainer;

    register(key: ProviderKey, value: IProvider): this;

    getProviders(): Map<ProviderKey, IProvider>;

    removeScope(child: IContainer): void;

    getInstances(): unknown[];

    dispose(): void;

    add(registration: IRegistration): this;
}
