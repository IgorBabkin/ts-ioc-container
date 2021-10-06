import { createHookDecorator } from 'ts-ioc-container';
import { onDisposeMetadataCollector } from './metadata';

export const onDispose = createHookDecorator(onDisposeMetadataCollector);
