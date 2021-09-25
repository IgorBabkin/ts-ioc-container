import React, { PropsWithChildren, useEffect, useMemo } from 'react';
import { LocatorContext, useLocator } from '../context';
import { Locator } from '../locator';
import { ScopeContext } from './scopeContext';

export function useScope<T>(context?: T): Locator {
  const locator = useLocator();
  const scope = useMemo(() => locator.createScope(new ScopeContext(context)), []);
  useEffect(() => {
    return () => scope.remove();
  }, [scope]);
  return scope;
}

export function Scope<T>({ children, context }: PropsWithChildren<{ context: T | undefined }>): JSX.Element {
  const scope = useScope(context);
  return <LocatorContext.Provider value={scope}>{children}</LocatorContext.Provider>;
}
