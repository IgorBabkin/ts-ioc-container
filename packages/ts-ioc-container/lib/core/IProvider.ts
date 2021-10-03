import { IServiceLocator } from './IServiceLocator';
import { IDisposable } from '../helpers/IDisposable';

export type ResolveDependency<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface ScopeOptions {
    level: number;
    name?: string;
}

export interface IProvider<T> extends IDisposable {
    clone(options: ScopeOptions): IProvider<T>;

    resolve(locator: IServiceLocator, ...args: any[]): T;

    readonly active: boolean;
}

export type ProviderKey = string | symbol;
