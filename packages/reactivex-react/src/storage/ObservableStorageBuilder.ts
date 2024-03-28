import { IReaderRepository } from './repository/IReaderRepository';
import { ICleaner } from './cleaner/ICleaner';
import { ObservableStorage } from './ObservableStorage';
import { DisableCleaner } from './cleaner/DisableCleaner';
import { DestroyCleaner } from './cleaner/DestroyCleaner';
import { ObservableReader, ReaderObserver } from './reader/ObservableReader';
import { ReaderRepository } from './repository/ReaderRepository';
import { IObservableStorage } from './IObservableStorage';

export type CleanMode = 'disable-reader' | 'destroy-reader';

export class ObservableStorageBuilder {
  private cleaner: ICleaner;

  static fromObserver(observer: ReaderObserver): ObservableStorageBuilder {
    return new ObservableStorageBuilder(
      new ReaderRepository((obs$, initial) => new ObservableReader(obs$, observer, initial)),
    );
  }

  constructor(private repository: IReaderRepository) {
    this.cleaner = new DisableCleaner(repository);
  }

  changeCleanupMode(mode: CleanMode): this {
    this.cleaner =
      mode === 'destroy-reader' ? new DestroyCleaner(this.repository) : new DisableCleaner(this.repository);
    return this;
  }

  build(): IObservableStorage {
    return new ObservableStorage(this.repository, this.cleaner);
  }
}
