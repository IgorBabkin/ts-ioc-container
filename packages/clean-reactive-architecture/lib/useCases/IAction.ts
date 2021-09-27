import { Observable } from 'rxjs';

export interface IAction<T> {
  before$: Observable<T>;
  after$: Observable<T>;

  dispatch(payload: T): void;
}
