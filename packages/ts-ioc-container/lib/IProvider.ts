import { IServiceLocator } from './IServiceLocator';

export type Resolving = 'singleton' | 'perScope' | 'perRequest';

export type ArgsFn = (l: IServiceLocator) => any[];

export interface IProviderOptions {
    resolving: Resolving;
    argsFn: ArgsFn;
}

export type ProviderFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IProvider<T> {
    fn: ProviderFn<T>;
    options: IProviderOptions;

    clone(options?: Partial<IProviderOptions>): IProvider<T>;
}

export type ProviderKey = string | symbol;
