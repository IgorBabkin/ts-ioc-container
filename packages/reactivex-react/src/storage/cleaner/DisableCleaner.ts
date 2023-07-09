import { Observable } from 'rxjs';
import { ICleaner } from './ICleaner';
import { IReaderRepository } from '../repository/IReaderRepository';

export class DisableCleaner implements ICleaner {
  constructor(private repository: IReaderRepository) {}

  cleanup(obs$: Observable<unknown>): void {
    const reader = this.repository.find(obs$);
    reader.disable();
  }
}
