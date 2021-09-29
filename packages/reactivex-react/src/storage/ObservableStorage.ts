import { IObservableStorage } from './IObservableStorage';
import { Observable } from 'rxjs';
import { IReaderRepository } from './repository/IReaderRepository';
import { ICleaner } from './cleaner/ICleaner';

export class ObservableStorage implements IObservableStorage {
    private activeObservables = new Set<Observable<unknown>>();

    constructor(private readerRepository: IReaderRepository, private observableCleaner: ICleaner) {}

    cleanup(): void {
        const inactiveObservables = this.readerRepository.getExcluded(this.activeObservables);
        inactiveObservables.forEach((obs$) => this.observableCleaner.cleanup(obs$));
        this.activeObservables.clear();
    }

    dispose(): void {
        this.readerRepository.dispose();
        this.activeObservables.clear();
    }

    getValue<T>(obs$: Observable<T>): T | undefined {
        const current = this.readerRepository.findOrCreate(obs$).enable().current;
        this.activeObservables.add(obs$);
        return current;
    }
}