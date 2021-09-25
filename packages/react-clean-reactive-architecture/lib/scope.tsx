import React, { FC, useEffect, useMemo } from 'react';
import { LocatorContext, useLocator } from './context';
import { Locator } from './locator';

export function useScope(): Locator {
  const locator = useLocator();
  const scope = useMemo(() => locator.createScope(), []);
  useEffect(() => {
    return () => scope.remove();
  }, [scope]);
  return scope;
}

export const Scope: FC = ({ children }) => {
  const scope = useScope();
  return <LocatorContext.Provider value={scope}>{children}</LocatorContext.Provider>;
};
