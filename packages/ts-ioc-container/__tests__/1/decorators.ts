import 'reflect-metadata';
import { constructor, createInjectFnDecorator, InjectMetadataCollector, ProviderBuilder } from '../../lib';

export const injectMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(injectMetadataCollector);

export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
