import { IServiceLocator, Resolveable } from '../IServiceLocator';
import { IDisposable } from '../../helpers/types';
import { ProviderKey } from '../IProviderRepository';

export type ResolveDependency<T> = (locator: IServiceLocator, ...args: any[]) => T;

export type Tag = string | symbol;

export interface ScopeOptions {
    level: number;
    tags: Tag[];
}

export interface IProvider<T> extends IDisposable {
    clone(): IProvider<T>;

    resolve(locator: Resolveable, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export interface IKeyedProvider<T> extends IProvider<T> {
    clone(): IKeyedProvider<T>;
    getKeys(): ProviderKey[];
    addKeys(...keys: ProviderKey[]): this;
}
