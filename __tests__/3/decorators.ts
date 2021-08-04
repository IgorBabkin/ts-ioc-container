import 'reflect-metadata';
import { constructor, createInjectFnDecorator, InjectFn, InjectMetadataCollector, ProviderBuilder } from '../../lib';

export const constructorMetadataCollector = new InjectMetadataCollector();
export const inject = createInjectFnDecorator(constructorMetadataCollector);

export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
