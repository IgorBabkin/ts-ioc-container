import { Subject } from 'rxjs';
import { IAction } from './IAction';

export abstract class Action<T> implements IAction<T> {
    start$ = new Subject<T>();
    done$ = new Subject<T>();

    dispatch(payload: T): void {
        (async () => {
            this.start$.next(payload);
            await this.handle(payload);
            this.done$.next(payload);
        })();
    }

    protected abstract handle(payload: T): Promise<void>;
}
