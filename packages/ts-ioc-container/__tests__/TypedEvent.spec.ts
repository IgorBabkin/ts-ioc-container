import { TypedEvent, EventDisposedError, IObserver } from '../lib';
import { createMock } from './utils';
import { Times } from 'moq.ts';

describe('TypedEvent', () => {
  let event: TypedEvent<number>;

  beforeEach(() => {
    event = new TypedEvent<number>();
  });

  test('should allow observers to subscribe and receive emitted data', () => {
    const observer = createMock<IObserver<number>>();
    event.on(observer.object());

    event.emit(42);

    observer.verify((o) => o(42), Times.Once());
  });

  test('should allow observers to unsubscribe', () => {
    const observer = createMock<IObserver<number>>();
    const unsubscribe = event.on(observer.object());

    unsubscribe();
    event.emit(42);

    observer.verify((o) => o(42), Times.Never());
  });

  test('should call observer only once when using once method', () => {
    const observer = createMock<IObserver<number>>();
    event.once(observer.object());

    event.emit(42);
    event.emit(43);

    observer.verify((o) => o(42), Times.Once());
    observer.verify((o) => o(43), Times.Never());
  });

  test('should convert event to promise and resolve with emitted data', async () => {
    const promise = event.toPromise();

    event.emit(42);

    await expect(promise).resolves.toBe(42);
  });

  test('should dispose event and prevent further subscriptions or emissions', () => {
    const observer = createMock<IObserver<number>>();
    event.on(observer.object());

    event.dispose();

    expect(() => event.on(observer.object())).toThrow(EventDisposedError);
    expect(() => event.emit(42)).toThrow(EventDisposedError);
  });

  test('should create event from promise and emit resolved value', async () => {
    const promise = Promise.resolve(42);
    const eventFromPromise = TypedEvent.fromPromise(promise);

    const observer = createMock<IObserver<number>>();
    eventFromPromise.on(observer.object());

    await promise;

    observer.verify((o) => o(42), Times.Once());
    expect(() => eventFromPromise.emit(43)).toThrow(EventDisposedError);
  });
});
