import type { IContainer } from './container/IContainer';

// General execution context passed to callbacks that run within a scope.
export interface ExecutionContext {
  scope: IContainer;
}
