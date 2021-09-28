import { Observable, Subject } from 'rxjs';
import { IAction } from './IAction';

export abstract class Action<T> implements IAction<T> {
    private _after$ = new Subject<T>();
    private _before$ = new Subject<T>();

    dispatch(payload: T): void {
        (async () => {
            this._after$.next(payload);
            await this.handle(payload);
            this._before$.next(payload);
        })();
    }

    getAfter$(): Observable<T> {
        return this._after$.asObservable();
    }

    getBefore$(): Observable<T> {
        return this._after$.asObservable();
    }

    protected abstract handle(payload: T): Promise<void>;
}
