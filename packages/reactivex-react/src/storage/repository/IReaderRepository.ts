import { Observable } from 'rxjs';
import { IObservableReader } from '../reader/IObservableReader';
import { IDisposable } from '../../core/IDisposable';

export interface IReaderRepository extends IDisposable {
  findOrCreate<T>(obs$: Observable<T>, initial: T): IObservableReader<T>;

  find<T>(obs$: Observable<T>): IObservableReader<T>;

  dispose(): void;

  remove<T>(obs$: IObservableReader<T>): void;

  getExcluded(includedObservables: Set<Observable<unknown>>): Set<Observable<unknown>>;
}
