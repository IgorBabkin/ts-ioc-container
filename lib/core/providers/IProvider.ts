import { IServiceLocator } from '../IServiceLocator';
import { IDisposable } from '../../helpers/IDisposable';

export type ProviderFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IProvider<T> extends IDisposable {
    canBeCloned: boolean;

    clone(): IProvider<T>;

    resolve(locator: IServiceLocator, ...args: any[]): T;
}

export type ProviderKey = string | symbol;
