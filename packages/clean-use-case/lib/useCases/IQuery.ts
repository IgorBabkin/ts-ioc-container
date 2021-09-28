import { Observable } from 'rxjs';

export interface IQuery<T> {
    create(...args: unknown[]): Observable<T>;
}
