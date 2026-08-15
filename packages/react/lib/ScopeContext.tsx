import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { type constructor, type IContainer, InjectionToken } from 'ts-ioc-container';

import { OutOfScopeError } from './OutOfScopeError';

export const ScopeContext = createContext<IContainer | null>(null);

/**
 * Reads the surrounding scope, or `null` when there is no `ScopeContext.Provider` above the caller.
 */
export function useScope(): IContainer | null {
  return useContext(ScopeContext);
}

/**
 * @throws {OutOfScopeError} when there is no `ScopeContext.Provider` above the caller.
 */
export function useScopeOrFail(): IContainer {
  const container = useScope();
  if (!container) {
    throw new OutOfScopeError('useScopeOrFail must be called inside ScopeContext.Provider');
  }
  return container;
}

/**
 * @throws {OutOfScopeError} when there is no `ScopeContext.Provider` above the caller.
 */
export function useResolveOrFail<T>(key: InjectionToken<T> | constructor<T>): T {
  const container = useScopeOrFail();
  if (key instanceof InjectionToken) {
    return key.resolve(container);
  }
  return container.resolve(key);
}

interface ScopeProps {
  tags: string[];
  children: ReactNode;
}

/**
 * Creates a child scope for its subtree once, when the component instance is
 * first created (lazy state init), and disposes it on unmount.
 *
 * NOTE: relies on the surrounding tree not being wrapped in `StrictMode`.
 * StrictMode's dev-only mount/unmount/remount cycle runs this effect's
 * cleanup (disposing the scope) and then re-runs the effect's setup without
 * re-rendering the component, so there is no render pass left to create a
 * replacement — the subtree would be left on a disposed scope. Render the
 * app root outside `StrictMode`, or scope `StrictMode` to trees that don't
 * mount `Scope`.
 *
 * @throws {OutOfScopeError} when there is no `ScopeContext.Provider` above the caller.
 */
export function Scope(props: ScopeProps) {
  const parent = useScopeOrFail();
  const [child] = useState(() => parent.createScope({ tags: props.tags }));

  useEffect(() => () => child.dispose(), [child]);

  return <ScopeContext.Provider value={child}>{props.children}</ScopeContext.Provider>;
}
