import { ObservableNotFoundError } from '../src';
import { of } from 'rxjs';
import { createMock } from './helpers';
import { Times } from 'moq.ts';
import { IObservableReader } from '../src/storage/reader/IObservableReader';
import { CreateReader, ReaderRepository } from '../src/storage/repository/ReaderRepository';
import { ObservableReader } from '../src/storage/reader/ObservableReader';

describe('ReaderRepository', () => {
  it('should remove all observables on dispose', () => {
    const obs$ = of(2);
    const readerMock = createMock<IObservableReader<number>>();
    const createReader = (() => readerMock.object()) as CreateReader;

    const repository = new ReaderRepository(createReader);
    repository.findOrCreate(obs$, 0);
    repository.dispose();

    expect(() => repository.find(obs$)).toThrow(ObservableNotFoundError);
  });
  it('should dispose each reader on dispose', () => {
    const obs$ = of(2);
    const readerMock = createMock<IObservableReader<number>>();
    const createReader = (() => readerMock.object()) as CreateReader;

    const repository = new ReaderRepository(createReader);
    repository.findOrCreate(obs$, 0);
    repository.dispose();

    readerMock.verify((i) => i.disable(), Times.Once());
  });
  it('should raise an error when try to remove unexisting observable', () => {
    const obs$ = of(2);

    const repository = new ReaderRepository((s$, initial) => new ObservableReader(s$, () => {}, initial));

    expect(() => repository.remove(new ObservableReader(obs$, () => {}, 0))).toThrow(ObservableNotFoundError);
  });
  it('should raise an error when try to find unexisting observable', () => {
    const obs$ = of(2);

    const repository = new ReaderRepository((obs$, initial) => new ObservableReader(obs$, () => {}, initial));

    expect(() => repository.find(obs$)).toThrow(ObservableNotFoundError);
  });
});
