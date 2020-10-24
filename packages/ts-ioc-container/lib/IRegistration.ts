import { IServiceLocator } from './IServiceLocator';

export type Resolving = 'singleton' | 'perScope' | 'perRequest';

export interface IProviderOptions {
    resolving?: Resolving;
}

export type RegistrationFn<T> = (locator: IServiceLocator, ...args: any[]) => T;

export interface IRegistration<T> {
    fn: RegistrationFn<T>;
    options?: IProviderOptions;
}

export type RegistrationKey = string | symbol;
