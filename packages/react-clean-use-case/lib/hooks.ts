import { useMemo } from 'react';
import { Observable } from 'rxjs';
import { IAction, ICommand, IQuery, ISaga } from 'clean-use-case';

export type constructor<T> = new (...args: any[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;
export type UseDependency<T> = (token: InjectionToken<T>) => T;

export const createCommandHook =
    (useDependency: UseDependency<any>) =>
    <T extends ICommand>(value: InjectionToken<T>): T =>
        useDependency(value);

export const createActionHook =
    (useDependency: UseDependency<any>) =>
    <T extends IAction<Payload>, Payload = unknown>(value: InjectionToken<T>): T =>
        useDependency(value);

export const createSagaHook =
    (useDependency: UseDependency<any>) =>
    <T extends ISaga>(value: InjectionToken<T>): T =>
        useDependency(value);

export const createQueryHook =
    (useDependency: UseDependency<any>) =>
    <T extends IQuery<R>, R = unknown>(
        value: InjectionToken<T>,
        createQuery: (m: T) => Observable<R>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deps: any[] = [],
    ): Observable<R> => {
        const model = useDependency(value);
        return useMemo(() => createQuery(model), [model, ...deps]);
    };
