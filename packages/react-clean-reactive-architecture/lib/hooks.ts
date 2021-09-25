import { useDependency } from './context';
import { useEffect, useMemo } from 'react';
import { Observable } from 'rxjs';
import { IAction, ICommand, IQuery, ISaga } from 'clean-reactive-architecture';
import { constructor, InjectionToken, ProviderKey } from './locator';

export const useCommand = <T extends ICommand>(value: constructor<T>): T => useDependency(value);

export function useAction<T extends IAction<P>, P = unknown>(value: ProviderKey): T {
  const model = useDependency<T>(value);
  useEffect(() => () => model.dispose(), [model]);
  return model;
}

export const useSaga = <T extends ISaga>(value: InjectionToken<T>): void => {
  useDependency(value);
};

export const useQuery = <T extends IQuery<R>, R = unknown>(
  value: constructor<T>,
  createQuery: (m: T) => Observable<R>,
  deps: unknown[] = [],
): Observable<R> => {
  const model = useDependency(value);
  return useMemo(() => createQuery(model), [model, ...deps]);
};
