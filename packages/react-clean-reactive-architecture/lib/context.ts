import { createContext, useContext, useMemo } from 'react';
import { InjectionToken, Resolvable } from './locator';

export const LocatorContext = createContext<Resolvable | undefined>(undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDependency = <T>(token: InjectionToken<T>, ...args: any[]): T => {
  const locator = useContext(LocatorContext);
  if (!locator) {
    throw new Error('Context is not found');
  }
  return useMemo(() => {
    return locator.resolve(token, ...args);
  }, [token, ...args]);
};
