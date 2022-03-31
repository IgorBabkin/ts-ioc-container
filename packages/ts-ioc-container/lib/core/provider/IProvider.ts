import {Resolveable} from '../IServiceLocator';
import {IDisposable} from '../../helpers/types';

export type ResolveDependency<T> = (locator: Resolveable, ...args: any[]) => T;

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

