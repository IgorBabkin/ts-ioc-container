import {
  IReaderRepository,
  ObservableNotFoundError,
  ObservableReader,
  ObservableStorageBuilder,
  ReaderRepository,
} from '../src';
import { of } from 'rxjs';
import { Times } from 'moq.ts';
import { createMock } from './helpers';

describe('ObservableStorage', () => {
  let readerRepository: ReaderRepository;

  beforeEach(() => {
    readerRepository = new ReaderRepository((obs$) => new ObservableReader(obs$, () => {}));
  });

  it('should disable inactive observables', () => {
    const storage = new ObservableStorageBuilder(readerRepository).build();

    const obs1$ = of(1);
    const obs2$ = of(2);

    storage.getValue(obs1$);
    storage.getValue(obs2$);

    storage.cleanup();

    storage.getValue(obs1$);
    storage.cleanup();

    expect(() => readerRepository.find(obs1$)).not.toThrow(ObservableNotFoundError);
    expect(() => readerRepository.find(obs2$)).not.toThrow(ObservableNotFoundError);
  });

  it('should kick inactive observables out', () => {
    const storage = new ObservableStorageBuilder(readerRepository).changeCleanupMode('destroy-reader').build();

    const obs1$ = of(1);
    const obs2$ = of(2);

    storage.getValue(obs1$);
    storage.getValue(obs2$);

    storage.cleanup();

    storage.getValue(obs1$);
    storage.cleanup();

    expect(() => readerRepository.find(obs1$)).not.toThrow(ObservableNotFoundError);
    expect(() => readerRepository.find(obs2$)).toThrow(ObservableNotFoundError);
  });

  it('should dispose reader repo on dispose', () => {
    const readerRepoMock = createMock<IReaderRepository>();

    const storage = new ObservableStorageBuilder(readerRepoMock.object()).build();
    storage.dispose();

    readerRepoMock.verify((instance) => instance.dispose(), Times.Once());
  });
});
