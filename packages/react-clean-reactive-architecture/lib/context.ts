import { createContext, useContext, useMemo } from 'react';
import { InjectionToken, Resolvable } from './locator';

export const LocatorContext = createContext<Resolvable | undefined>(undefined);

export const useDependency = <T>(token: InjectionToken<T>, ...args: unknown[]): T => {
  const locator = useContext(LocatorContext);
  if (!locator) {
    throw new Error('Context is not found');
  }
  return useMemo(() => {
    return locator.resolve(token, ...args);
  }, [token, ...args]);
};
