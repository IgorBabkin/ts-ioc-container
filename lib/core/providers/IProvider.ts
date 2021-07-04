import { IServiceLocator } from '../IServiceLocator';

export type Resolving = 'singleton' | 'perScope' | 'perRequest';

export type ArgsFn = (l: IServiceLocator) => any[];

export type ProviderFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IProvider<T> {
    canBeCloned: boolean;

    clone(): IProvider<T>;

    resolve(locator: IServiceLocator, ...args: any[]): T;

    dispose(): void;
}

export type ProviderKey = string | symbol;
