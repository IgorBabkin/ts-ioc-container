import { Observable } from 'rxjs';

export interface ICleaner {
  cleanup(obs$: Observable<unknown>): void;
}
