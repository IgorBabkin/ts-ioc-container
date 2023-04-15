import { InjectionToken, Resolveable } from '../container/IContainer';
import { Disposable } from '../utils/types';

export type ResolveDependency<T> = (container: Resolveable, ...args: unknown[]) => T;

export type Tag = string;

export interface Tagged {
    readonly tags: Tag[];
}

export interface IProvider<T = unknown> extends Disposable {
    clone(): IProvider<T>;

    resolve(container: Resolveable, ...args: unknown[]): T;

    isValid(filters: Tagged): boolean;
}

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
