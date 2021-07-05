import { IServiceLocator } from '../IServiceLocator';

export type ProviderFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IProvider<T> {
    canBeCloned: boolean;

    clone(): IProvider<T>;

    resolve(locator: IServiceLocator, ...args: any[]): T;

    dispose(): void;
}

export type ProviderKey = string | symbol;
