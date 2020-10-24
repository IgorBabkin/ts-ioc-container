import { InjectionToken } from './strategy/ioc/decorators';
import { IProviderOptions, RegistrationFn, RegistrationKey } from './IRegistration';

export type constructor<T> = new (...args: any[]) => T;

export type Factory<T> = (...args: any[]) => T;

export interface IServiceLocator {
    createContainer(): IServiceLocator;

    remove(): void;

    resolve<T>(c: InjectionToken<T>, ...deps: any[]): T;

    has(key: RegistrationKey): boolean;

    registerConstructor<T>(key: RegistrationKey, value: constructor<T>, options?: IProviderOptions): this;

    registerInstance<T>(key: RegistrationKey, value: T): this;

    registerFunction<T>(key: RegistrationKey, resolveFn: RegistrationFn<T>, options?: IProviderOptions): this;
}
