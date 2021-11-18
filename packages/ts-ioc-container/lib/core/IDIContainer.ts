import { RegisterOptions, Resolveable } from './IServiceLocator';
import { IKeyedProvider, ResolveDependency, Tag } from './provider/IProvider';
import { constructor, IDisposable } from '../helpers/types';
import { ProviderBuilder } from '../features/ProviderBuilder';

export interface IDIProviderBuilder {
    fromClass<T>(value: constructor<T>): ProviderBuilder<T>;

    fromValue<T>(value: T): ProviderBuilder<T>;

    fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T>;
}

export type RegistrationFn = (builder: IDIProviderBuilder) => IKeyedProvider<unknown>;

export interface IDIContainer extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IDIContainer;

    register(fn: RegistrationFn, options?: Partial<RegisterOptions>): this;
}
