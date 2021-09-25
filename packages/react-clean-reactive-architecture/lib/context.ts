import { createContext, useContext, useMemo } from 'react';
import { InjectionToken, Locator } from './locator';

export const LocatorContext = createContext<Locator | undefined>(undefined);

export function useLocator(): Locator {
  const locator = useContext(LocatorContext);
  if (!locator) {
    throw new Error('Context is not found');
  }
  return locator;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDependency = <T>(token: InjectionToken<T>, ...args: any[]): T => {
  const locator = useLocator();
  return useMemo(() => locator.resolve(token, ...args), [token, ...args]);
};
