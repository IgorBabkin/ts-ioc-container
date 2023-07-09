import { BehaviorSubject, from, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { IAppViewModel } from './IAppViewModel';

export class AppViewModel implements IAppViewModel {
  time$: Observable<number>;
  firstName$ = new BehaviorSubject<string>('');
  lastName$ = new BehaviorSubject<string>('');
  myNumbers$ = from([1, 2, 3, 4]);
  canShowTime$ = new BehaviorSubject(false);

  constructor() {
    this.time$ = timer(2000, 1000).pipe(map(() => Date.now()));
  }

  toggle(): void {
    this.canShowTime$.next(!this.canShowTime$.getValue());
  }

  changeFirstName(value: string): void {
    this.firstName$.next(value);
  }

  changeLastName(value: string): void {
    this.lastName$.next(value);
  }
}
