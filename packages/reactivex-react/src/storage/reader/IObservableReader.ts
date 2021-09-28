import { IDisposable } from '../../core/IDisposable';
import { Observable } from 'rxjs';

export interface IObservableReader<T> extends IDisposable {
    readonly obs$: Observable<T>;

    enable(): this;

    disable(): this;

    current: T | undefined;
}
