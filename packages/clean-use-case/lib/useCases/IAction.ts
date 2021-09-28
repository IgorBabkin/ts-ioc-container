import { Observable } from 'rxjs';

export interface IAction<T> {
    getBefore$(): Observable<T>;
    getAfter$(): Observable<T>;

    dispatch(payload: T): void;
}
