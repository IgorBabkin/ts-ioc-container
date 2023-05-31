import * as React from 'react';
import { PropsWithChildren, useMemo } from 'react';
import { IContainer, InjectionToken } from '@ibabkin/ts-ioc-container';

export const ScopeContext = React.createContext<IContainer | null>(null);
const useScope = () => {
    const scope = React.useContext(ScopeContext);
    if (!scope) {
        throw new Error('Scope not found');
    }
    return scope;
};

export const useDependency = <T,>(token: InjectionToken<T>, ...deps: unknown[]): T => {
    const scope = useScope();
    return useMemo(() => scope.resolve<T>(token, ...deps), [scope, token, ...deps]);
};
export function Scope({ children, tags }: PropsWithChildren<{ tags?: string }>): JSX.Element {
    const parentScope = useScope();
    const scope = React.useMemo(
        () => parentScope.createScope(tags?.split(',').map((v) => v.trim())),
        [parentScope, tags],
    );
    return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}
