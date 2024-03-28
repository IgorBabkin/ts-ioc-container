import { Observable } from 'rxjs';

export interface IObservableReader<T> {
  readonly obs$: Observable<T>;

  enable(): this;

  disable(): this;

  current: T;
}
