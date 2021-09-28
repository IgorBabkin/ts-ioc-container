import React, { PropsWithChildren, ReactNode } from 'react';
import { Observable } from 'rxjs';
import { useObservable } from './hooks';

interface SubscriptionProps<T> {
    obs$: Observable<T>;
    children?: (value: T) => ReactNode | undefined;
    fallback?: () => ReactNode | undefined;
}

export function Subscription<T>({
    obs$,
    children = (value: T) => value,
    fallback = () => undefined,
}: PropsWithChildren<SubscriptionProps<T>>): JSX.Element {
    const value = useObservable(obs$);
    return <>{value === undefined ? fallback() : children(value)}</>;
}

interface EachProps<T> {
    obs$: Observable<T[]>;
    children: (value: T) => ReactNode | undefined;
}

export function Each<T>({ obs$, children }: PropsWithChildren<EachProps<T>>): JSX.Element {
    const value = useObservable(obs$);
    return <>{value !== undefined ? value.map(children) : undefined}</>;
}

interface IfProps<T> {
    obs$: Observable<T>;
    predicate?: (value: T) => boolean;
}

export function If<T>({
    obs$,
    children,
    predicate = (value: T) => !!value,
}: PropsWithChildren<IfProps<T>>): JSX.Element {
    const value = useObservable(obs$);
    return <>{value !== undefined && predicate(value) ? children : undefined}</>;
}
