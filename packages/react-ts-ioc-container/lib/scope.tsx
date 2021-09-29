import React, { PropsWithChildren, useEffect, useMemo } from 'react';
import { LocatorContext, useLocator } from './context';
import { Locator } from './locator';

export function useScope<T>(context?: T): Locator {
    const locator = useLocator();
    const scope = useMemo(() => locator.createScope(context), [context]);
    useEffect(() => () => scope.remove(), [scope]);
    return scope;
}

export function Scope<T>({ children, context }: PropsWithChildren<{ context?: T }>): JSX.Element {
    const scope = useScope(context);
    return <LocatorContext.Provider value={scope}>{children}</LocatorContext.Provider>;
}