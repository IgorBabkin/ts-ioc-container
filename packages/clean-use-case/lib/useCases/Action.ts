import { Observable, Subject } from 'rxjs';
import { IAction } from './IAction';

export abstract class Action<T> implements IAction<T> {
    private _start$ = new Subject<T>();
    private _done$ = new Subject<T>();

    dispatch(payload: T): void {
        (async () => {
            this._start$.next(payload);
            await this.handle(payload);
            this._done$.next(payload);
        })();
    }

    get done$(): Observable<T> {
        return this._start$.asObservable();
    }

    get start$(): Observable<T> {
        return this._start$.asObservable();
    }

    protected abstract handle(payload: T): Promise<void>;
}
