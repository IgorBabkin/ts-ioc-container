import { createContext, useContext, useMemo } from 'react';
import { InjectionToken, Locator } from './locator';

export const LocatorContext = createContext<Locator | undefined>(undefined);

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
