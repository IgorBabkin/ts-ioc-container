import { Observable } from 'rxjs';

export interface IAction<T> {
    start$: Observable<T>;
    done$: Observable<T>;

    dispatch(payload: T): void;
}
