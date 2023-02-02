import { InjectionToken, Resolveable } from '../IContainer';
import { IDisposable } from '../../helpers/types';

export type ResolveDependency<T> = (container: Resolveable, ...args: any[]) => T;

export type Tag = string | symbol;

export interface ScopeOptions {
    level: number;
    tags: Tag[];
}

export interface IProvider<T> extends IDisposable {
    setKey(key: ProviderKey): void;
    getKeyOrFail(): ProviderKey;
    clone(): IProvider<T>;

    resolve(container: Resolveable, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export type ProviderKey = string | symbol;

export function isProviderKey<T>(token: InjectionToken<T>): token is ProviderKey {
    return ['string', 'symbol'].includes(typeof token);
}
