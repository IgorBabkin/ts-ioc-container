import { IServiceLocator } from './IServiceLocator';
import { IDisposable } from '../helpers/IDisposable';

export type ResolveDependency<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface ScopeOptions {
    level: number;
    tags: string[];
}

export interface IProvider<T> extends IDisposable {
    clone(): IProvider<T>;

    resolve(locator: IServiceLocator, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export type ProviderKey = string | symbol;
