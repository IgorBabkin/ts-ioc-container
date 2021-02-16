import { IServiceLocator } from './IServiceLocator';

export type Resolving = 'singleton' | 'perScope' | 'perRequest';

export type ArgsFn = (l: IServiceLocator) => any[];

export interface IProviderOptions {
    resolving: Resolving;
    argsFn: ArgsFn;
}

export type RegistrationFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IRegistration<T> {
    fn: RegistrationFn<T>;
    options?: IProviderOptions;
}

export type RegistrationKey = string | symbol;
