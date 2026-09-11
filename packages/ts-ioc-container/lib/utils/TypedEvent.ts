import { TypedEventDisposedError } from '../errors/TypedEventDisposedError';

export type TypedEventListener<TArgs extends unknown[]> = (...args: TArgs) => void;

export type Unsubscribe = () => void;

/**
 * The subscriber's side of a {@link TypedEvent}: attach, detach, tear down.
 * Hand this out instead of the event itself so that only the owner can `emit`.
 */
export interface ITypedEvent<TArgs extends unknown[]> {
  /**
   * Attaches `listener` and returns a function which detaches it again. A
   * listener subscribed more than once is still delivered each emission once.
   *
   * @throws {TypedEventDisposedError} when the event has already been disposed.
   */
  subscribe(listener: TypedEventListener<TArgs>): Unsubscribe;

  /**
   * Detaches `listener`. Harmless when it is not subscribed, or after `dispose`.
   */
  unsubscribe(listener: TypedEventListener<TArgs>): void;

  /**
   * Detaches every listener and rejects further `subscribe` / `emit` calls.
   */
  dispose(): void;
}

/**
 * A typed, multi-listener event. `TArgs` is the argument list a listener
 * receives, so a `TypedEvent<[IContainer]>` accepts `(scope: IContainer) => void`
 * listeners unchanged.
 *
 * Emission delivers to the listeners subscribed at the moment `emit` is called,
 * in subscription order. A listener detached mid-emission is skipped for the
 * rest of that emission; one attached mid-emission receives only later ones.
 */
export class TypedEvent<TArgs extends unknown[] = []> implements ITypedEvent<TArgs> {
  private readonly listeners = new Set<TypedEventListener<TArgs>>();
  private isDisposed = false;

  /**
   * @throws {TypedEventDisposedError} when the event has already been disposed.
   */
  subscribe(listener: TypedEventListener<TArgs>): Unsubscribe {
    this.validate();
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: TypedEventListener<TArgs>): void {
    this.listeners.delete(listener);
  }

  /**
   * Calls every current listener with `args`. What a listener throws surfaces
   * out of `emit` and stops delivery to the listeners after it.
   *
   * @throws {TypedEventDisposedError} when the event has already been disposed.
   * @throws {unknown} rethrows whatever a listener threw.
   */
  emit(...args: TArgs): void {
    this.validate();
    // Iterate a snapshot so a listener can (un)subscribe without disturbing this emission;
    // a listener detached mid-emission is still skipped for the rest of it.
    for (const listener of [...this.listeners]) {
      if (this.listeners.has(listener)) {
        listener(...args);
      }
    }
  }

  /**
   * A copy of the current listeners, in subscription order.
   */
  getListeners(): TypedEventListener<TArgs>[] {
    return [...this.listeners];
  }

  dispose(): void {
    this.listeners.clear();
    this.isDisposed = true;
  }

  /**
   * @throws {TypedEventDisposedError} when the event has already been disposed.
   */
  private validate(): void {
    TypedEventDisposedError.assert(!this.isDisposed, 'TypedEvent is already disposed');
  }
}
