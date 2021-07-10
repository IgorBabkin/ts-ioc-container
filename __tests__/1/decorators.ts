import 'reflect-metadata';
import { constructor, InjectFn, ProviderBuilder } from '../../lib';
import { ConstructorMetadataCollector } from '../../lib/metadata';

export const constructorMetadataCollector = new ConstructorMetadataCollector();
export const inject =
    <T>(injectionFn: InjectFn<T>): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        constructorMetadataCollector.addMetadata(target, parameterIndex, injectionFn);
    };

export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
