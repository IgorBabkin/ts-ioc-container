import { constructor, InjectionToken, ProviderKey, useDependency } from 'react-ts-ioc-container';
import { useMemo } from 'react';
import { Observable } from 'rxjs';
import { IAction, ICommand, IQuery, ISaga } from 'clean-use-case';

export const useCommand = <T extends ICommand>(value: constructor<T>): T => useDependency(value);

export function useAction<T extends IAction<P>, P = unknown>(value: ProviderKey): T {
    return useDependency<T>(value);
}

export const useSaga = <T extends ISaga>(value: InjectionToken<T>): void => {
    useDependency(value);
};

export const useQuery = <T extends IQuery<R>, R = unknown>(
    value: constructor<T>,
    createQuery: (m: T) => Observable<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deps: any[] = [],
): Observable<R> => {
    const model = useDependency(value);
    return useMemo(() => createQuery(model), [model, ...deps]);
};
