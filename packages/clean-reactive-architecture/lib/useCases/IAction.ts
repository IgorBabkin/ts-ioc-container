import { Observable } from 'rxjs';
import { IDisposable } from '../core/IDisposable';
import { Initializable } from '../core/Initializable';

export interface IAction<T> extends IDisposable, Initializable {
  dispatch(payload: T): void;

  getPayload(): Observable<T>;
}
