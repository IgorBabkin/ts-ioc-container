import { Observable, Subject, Subscription } from 'rxjs';
import { IAction } from './IAction';

export abstract class Action<T> implements IAction<T> {
  private payload$ = new Subject<T>();
  private subscriptions: Subscription[] = [];

  initialize(): void {
    this.subscriptions.push(this.payload$.subscribe((value) => this.handle(value)));
  }

  dispatch(payload: T): void {
    this.payload$.next(payload);
  }

  dispose(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  protected abstract handle(payload: T): void | Promise<void>;

  getPayload(): Observable<T> {
    return this.payload$;
  }
}
