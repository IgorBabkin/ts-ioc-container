import type { IContainer } from './container/IContainer';

// General execution context passed to callbacks that run within a scope.
export interface ExecutionContext {
  scope: IContainer;
}

// Receives whatever a hook threw or rejected with, together with the context it ran in.
export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;
