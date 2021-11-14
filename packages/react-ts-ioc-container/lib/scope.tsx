import React, { PropsWithChildren, useEffect, useMemo } from 'react';
import { LocatorContext, useLocator } from './context';
import { Locator, LocatorOptions } from './locator';
import { Tag } from 'ts-ioc-container';

export function useScope(tags?: Tag[]): Locator {
    const locator = useLocator();
    const scope = useMemo(() => locator.createScope({ tags }), [tags, locator]);
    useEffect(() => () => scope.remove(), [scope]);
    return scope;
}

export function Scope({ children, tags }: PropsWithChildren<LocatorOptions>): JSX.Element {
    const scope = useScope(tags);
    return <LocatorContext.Provider value={scope}>{children}</LocatorContext.Provider>;
}
