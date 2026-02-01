// Import types to ensure declaration merging is applied
import './types';

// Export plugin
export { containerPlugin, type ContainerPluginOptions } from './plugin';

// Re-export commonly used types from ts-ioc-container
export type {
  IContainer,
  IContainerModule,
  DependencyKey,
  Tag,
  Tagged,
  ResolveOneOptions,
  ResolveManyOptions,
} from 'ts-ioc-container';
