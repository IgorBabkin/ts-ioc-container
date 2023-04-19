import { InjectionToken, Resolveable } from '../container/IContainer';

export type ResolveDependency<T> = (container: Resolveable, ...args: unknown[]) => T;

export type Tag = string;

export interface Tagged {
    readonly tags: Tag[];
}

export interface IProvider<T = unknown> {
    clone(): IProvider<T>;

    resolve(container: Resolveable, ...args: unknown[]): T;

    isValid(filters: Tagged): boolean;

    dispose(): void;
}

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
