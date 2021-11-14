import 'reflect-metadata';
import {
    constructor,
    createInjectFnDecorator,
    InjectMetadataCollector,
    ProviderBuilder,
    ResolveDependency,
} from '../../lib';

export const constructorMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(constructorMetadataCollector);

export const fromFn = <T>(fn: ResolveDependency<T>): ProviderBuilder<T> => ProviderBuilder.fromFn(fn);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromValue(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromClass(value);
