import { Observable } from 'rxjs';
import { IReaderRepository } from './IReaderRepository';
import { IObservableReader } from '../reader/IObservableReader';
import { ObservableNotFoundError } from '../../errors/ObservableNotFoundError';
import { MathSet } from '../../core/MathSet';

export type CreateReader = <T>(obs$: Observable<T>) => IObservableReader<T>;

export class ReaderRepository implements IReaderRepository {
  private observables = new Map<Observable<unknown>, IObservableReader<unknown>>();

  constructor(private createReader: CreateReader) {}

  find<T>(obs$: Observable<T>): IObservableReader<T> {
    if (!this.observables.has(obs$)) {
      throw new ObservableNotFoundError(obs$);
    }
    return this.observables.get(obs$) as IObservableReader<T>;
  }

  findOrCreate<T>(obs$: Observable<T>): IObservableReader<T> {
    if (!this.observables.has(obs$)) {
      this.observables.set(obs$, this.createReader(obs$));
    }
    return this.observables.get(obs$) as IObservableReader<T>;
  }

  dispose(): void {
    this.observables.forEach((r) => r.disable());
    this.observables.clear();
  }

  remove<T>(reader: IObservableReader<T>): void {
    const isDeleted = this.observables.delete(reader.obs$);
    if (!isDeleted) {
      throw new ObservableNotFoundError(reader.obs$);
    }
  }

  getExcluded(includedObservables: Set<Observable<unknown>>): Set<Observable<unknown>> {
    const all = MathSet.fromIterator(this.observables.keys());
    const included = new MathSet(includedObservables);
    const excluded = all.subtract(included);
    return excluded.toSet();
  }
}
