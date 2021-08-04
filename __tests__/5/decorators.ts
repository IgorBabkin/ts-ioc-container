import 'reflect-metadata';
import { constructor, createInjectFnDecorator, InjectMetadataCollector, ProviderBuilder, ProviderFn } from '../../lib';

export const constructorMetadataCollector = new InjectMetadataCollector();
export const inject = createInjectFnDecorator(constructorMetadataCollector);

export const fromFn = <T>(fn: ProviderFn<T>): ProviderBuilder<T> => new ProviderBuilder(fn);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
