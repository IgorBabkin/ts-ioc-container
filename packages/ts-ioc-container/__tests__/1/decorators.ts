import 'reflect-metadata';
import { createInjectFnDecorator, InjectMetadataCollector } from '../../lib';

export const injectMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(injectMetadataCollector);
