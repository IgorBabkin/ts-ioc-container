export type IObserver<T> = (data: T) => void;
export type IUnsubscribe = () => void;

export class TypedEvent<T> {
  static fromPromise<T>(promise: Promise<T>) {
    const event = new TypedEvent();
    promise.then((value) => {
      event.emit(value);
      event.dispose();
    });
    return event;
  }

  private observerStorage: Array<IObserver<T>> = [];

  on(observer: IObserver<T>): IUnsubscribe {
    this.observerStorage.push(observer);
    return () => this.off(observer);
  }

  once(observer: IObserver<T>): IUnsubscribe {
    const onceObserver: IObserver<T> = (data) => {
      observer(data);
      this.off(onceObserver);
    };
    this.observerStorage.push(onceObserver);
    return () => this.off(onceObserver);
  }

  off(observer: IObserver<T>): void {
    this.observerStorage = this.observerStorage.filter((o) => o !== observer);
  }

  emit(data: T): void {
    this.observerStorage.forEach((o) => o(data));
  }

  toPromise(): Promise<T> {
    return new Promise((resolve) => this.once(resolve));
  }

  dispose(): void {
    this.observerStorage = [];
  }
}
