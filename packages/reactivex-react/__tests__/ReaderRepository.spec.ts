import { IObservableReader, ObservableNotFoundError, ObservableReader, ReaderRepository } from '../src';
import { CreateReader } from '../src';
import { of } from 'rxjs';
import { createMock } from './helpers';
import { Times } from 'moq.ts';

describe('ReaderRepository', () => {
    it('should remove all observables on dispose', () => {
        const obs$ = of(2);
        const readerMock = createMock<IObservableReader<number>>();
        const createReader = (() => readerMock.object()) as CreateReader;

        const repository = new ReaderRepository(createReader);
        repository.findOrCreate(obs$);
        repository.dispose();

        expect(() => repository.find(obs$)).toThrow(ObservableNotFoundError);
    });
    it('should dispose each reader on dispose', () => {
        const obs$ = of(2);
        const readerMock = createMock<IObservableReader<number>>();
        const createReader = (() => readerMock.object()) as CreateReader;

        const repository = new ReaderRepository(createReader);
        repository.findOrCreate(obs$);
        repository.dispose();

        readerMock.verify((i) => i.disable(), Times.Once());
    });
    it('should raise an error when try to remove unexisting observable', () => {
        const obs$ = of(2);

        const repository = new ReaderRepository((obs$) => new ObservableReader(obs$, () => {}));

        expect(() => repository.remove(new ObservableReader(obs$, () => {}))).toThrow(ObservableNotFoundError);
    });
    it('should raise an error when try to find unexisting observable', () => {
        const obs$ = of(2);

        const repository = new ReaderRepository((obs$) => new ObservableReader(obs$, () => {}));

        expect(() => repository.find(obs$)).toThrow(ObservableNotFoundError);
    });
});
