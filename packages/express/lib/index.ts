// Import types to ensure declaration merging is applied
import './types';

// Export middleware
export { containerMiddleware, type ContainerMiddlewareOptions } from './middleware';

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
