import { createContext, useContext } from 'solid-js';
import type { IContainer } from 'ts-ioc-container';
import { NotFoundScopeError } from './errors/NotFoundScopeError';

export const ScopeContext = createContext<IContainer | null>(null);

/**
 * Hook to get the current container scope from context.
 * Throws NotFoundScopeError if used outside of a Scope component.
 */
export function useScopeOrFail(): IContainer {
  const container = useContext(ScopeContext);
  if (!container) {
    throw new NotFoundScopeError();
  }
  return container;
}
