import { BehaviorSubject, Observable } from 'rxjs';

export type MapFn<T> = (value: T) => T;

export class ReactiveObject<T> {
    private value$: BehaviorSubject<T>;

    constructor(initial: T) {
        this.value$ = new BehaviorSubject(initial);
    }

    map(reduce: MapFn<T>): this {
        this.value$.next(reduce(this.value$.getValue()));
        return this;
    }

    toObservable(): Observable<T> {
        return this.value$.asObservable();
    }
}
