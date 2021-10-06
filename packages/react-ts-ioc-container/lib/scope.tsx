import React, { PropsWithChildren, useEffect, useMemo } from 'react';
import { LocatorContext, useLocator } from './context';
import { Locator, LocatorOptions } from './locator';

export function useScope<T>(options: LocatorOptions<T>): Locator {
    const locator = useLocator();
    const scope = useMemo(() => locator.createScope(options), [options.tags, options.context]);
    useEffect(() => () => scope.remove(), [scope]);
    return scope;
}

export function Scope<T>({ children, context, tags }: PropsWithChildren<LocatorOptions<T>>): JSX.Element {
    const scope = useScope({ context, tags });
    return <LocatorContext.Provider value={scope}>{children}</LocatorContext.Provider>;
}
