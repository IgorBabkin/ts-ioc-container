import { BehaviorSubject, Observable } from 'rxjs';

export type Reducer<T> = (value: T) => T;

export class ReactiveObject<T> {
  private value$: BehaviorSubject<T>;

  constructor(initial: T) {
    this.value$ = new BehaviorSubject(initial);
  }

  setValue(value: T): void {
    this.value$.next(value);
  }

  update(reducer: Reducer<T>): void {
    this.value$.next(reducer(this.value$.getValue()));
  }

  toObservable(): Observable<T> {
    return this.value$.asObservable();
  }
}
