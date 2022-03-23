import React, {PropsWithChildren, ReactNode, useMemo} from "react";
import {Subscription} from "./components";
import {combineLatest, Observable} from "rxjs";

export function CombineTheLatest<A>(props: PropsWithChildren<{ obs$: [Observable<A>]; children?: (value: [A]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>]; children?: (value: [A, B]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>]; children?: (value: [A, B, C]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>]; children?: (value: [A, B, C, D]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>]; children?: (value: [A, B, C, D, E]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E, F>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>, Observable<F>]; children?: (value: [A, B, C, D, E, F]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E, F, G>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>, Observable<F>, Observable<G>]; children?: (value: [A, B, C, D, E, F, G]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E, F, G, H>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>, Observable<F>, Observable<G>, Observable<H>]; children?: (value: [A, B, C, D, E, F, G, H]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E, F, G, H, I>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>, Observable<F>, Observable<G>, Observable<H>, Observable<I>]; children?: (value: [A, B, C, D, E, F, G, H, I]) => ReactNode | undefined; }>): JSX.Element;
export function CombineTheLatest<A, B, C, D, E, F, G, H, I, J>(props: PropsWithChildren<{ obs$: [Observable<A>, Observable<B>, Observable<C>, Observable<D>, Observable<E>, Observable<F>, Observable<G>, Observable<H>, Observable<I>, Observable<J>]; children?: (value: [A, B, C, D, E, F, G, H, I, J]) => ReactNode | undefined; }>): JSX.Element;

export function CombineTheLatest({
                                     obs$,
                                     children
                                 }: PropsWithChildren<{ obs$: any[]; children?: (value: any) => ReactNode | undefined; }>): JSX.Element {
    const values$ = useMemo(() => combineLatest(obs$), [...obs$]);
    return <Subscription obs$={values$}>{children}</Subscription>
}