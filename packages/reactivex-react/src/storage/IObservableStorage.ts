import { IDisposable } from '../core/IDisposable';
import { Observable } from 'rxjs';

export interface IObservableStorage extends IDisposable {
  cleanup(): void;

  getValue<T>(obs$: Observable<T>): T | undefined;
}
