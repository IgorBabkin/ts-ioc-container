import { createContext, useContext, useMemo } from 'react';
import { InjectionToken, Locator } from './locator';
import { isProviderKey } from 'ts-ioc-container';

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
    return useMemo(
        () => (isProviderKey(token) ? locator.resolve(token, ...args) : locator.resolveClass(token, ...args)),
        [token, ...args],
    );
};
