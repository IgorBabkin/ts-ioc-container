import { InjectionToken, Resolvable } from '../container/IContainer';

export type ResolveDependency<T> = (container: Resolvable, ...args: unknown[]) => T;

export type Tag = string;

export interface Tagged {
    hasTag(tag: Tag): boolean;
}

export interface IProvider<T = unknown> {
    clone(): IProvider<T>;

    resolve(container: Resolvable, ...args: unknown[]): T;

    isValid(filters: Tagged): boolean;

    dispose(): void;
}

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
