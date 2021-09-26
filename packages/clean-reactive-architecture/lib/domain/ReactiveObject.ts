import { BehaviorSubject, Observable } from 'rxjs';

export type Reduce<T> = (value: T) => T;

export class ReactiveObject<T> {
  private value$: BehaviorSubject<T>;

  constructor(initial: T) {
    this.value$ = new BehaviorSubject(initial);
  }

  update(reduce: Reduce<T>): void {
    this.value$.next(reduce(this.value$.getValue()));
  }

  toObservable(): Observable<T> {
    return this.value$.asObservable();
  }
}
