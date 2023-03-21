import { InjectionToken, Resolveable } from '../container/IContainer';
import { Disposable } from '../utils/types';

export type ResolveDependency<T> = (container: Resolveable, ...args: any[]) => T;

export type Tag = string;

export interface ScopeOptions {
    level: number;
    tags: Tag[];
}

export interface IProvider<T> extends Disposable {
    setKey(key: ProviderKey): this;
    getKeyOrFail(): ProviderKey;
    clone(): IProvider<T>;

    resolve(container: Resolveable, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
