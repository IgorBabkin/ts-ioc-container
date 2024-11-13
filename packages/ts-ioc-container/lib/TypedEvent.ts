export type IObserver<T> = (data: T) => void;
export type IUnsubscribe = () => void;

export class EventDisposedError extends Error {
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new EventDisposedError(message);
    }
  }
}

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
  private isDisposed = false;

  on(observer: IObserver<T>): IUnsubscribe {
    this.validate();
    this.observerStorage.push(observer);
    return () => this.off(observer);
  }

  once(observer: IObserver<T>): IUnsubscribe {
    this.validate();
    const onceObserver: IObserver<T> = (data) => {
      observer(data);
      this.off(onceObserver);
    };
    this.observerStorage.push(onceObserver);
    return () => this.off(onceObserver);
  }

  off(observer: IObserver<T>): void {
    this.validate();
    this.observerStorage = this.observerStorage.filter((o) => o !== observer);
  }

  emit(data: T): void {
    this.validate();
    this.observerStorage.forEach((o) => o(data));
  }

  toPromise(): Promise<T> {
    return new Promise((resolve) => this.once(resolve));
  }

  dispose(): void {
    this.validate();
    this.isDisposed = true;
    this.observerStorage = [];
  }

  private validate(): void {
    if (this.isDisposed) {
      throw new EventDisposedError('Event is disposed');
    }
  }
}
