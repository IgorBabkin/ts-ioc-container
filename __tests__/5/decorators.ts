import 'reflect-metadata';
import { constructor, ConstructorMetadataCollector, InjectFn, ProviderBuilder, ProviderFn } from '../../lib';

export const constructorMetadataCollector = new ConstructorMetadataCollector();
export const inject =
    <T>(injectionFn: InjectFn<T>): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        constructorMetadataCollector.addMetadata(target, parameterIndex, injectionFn);
    };

export const fromFn = <T>(fn: ProviderFn<T>): ProviderBuilder<T> => new ProviderBuilder(fn);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
