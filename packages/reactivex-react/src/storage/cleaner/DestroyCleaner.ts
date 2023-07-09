import { Observable } from 'rxjs';
import { ICleaner } from './ICleaner';
import { IReaderRepository } from '../repository/IReaderRepository';

export class DestroyCleaner implements ICleaner {
  constructor(private repository: IReaderRepository) {}

  cleanup(obs$: Observable<unknown>): void {
    const reader = this.repository.find(obs$);
    reader.disable();
    this.repository.remove(reader);
  }
}
