import 'reflect-metadata';
import {
  addMethodTag,
  by,
  Container,
  decorate,
  getMethodTags,
  type IContainer,
  inject,
  ProxyRegistry,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * Retry later: replay failed calls when something recovers
 *
 * Retrying in a loop is the wrong tool when the cause is outside your control -
 * the device is offline, the session expired. The call should wait until the
 * world recovers and then run again, with the same arguments, without the user
 * repeating it.
 *
 * - `@retryable()` tags a method with method metadata.
 * - The `retrying()` registration pipe proxies the class. When a tagged method
 *   fails, the error gets a `retry` callback that calls the method again through
 *   the proxy, and is filed with the application's `RetryQueue`. The error still
 *   reaches the caller - filing it is not handling it.
 * - Whatever notices the recovery - a connection event, a successful login -
 *   calls `queue.retry(predicate)`. The predicate is the policy: by error class,
 *   by status code, by anything the error carries.
 * - Replays are one-shot: a replay that fails again is filed as a fresh error.
 */

// --- The engine ------------------------------------------------------------

interface IRetryableError extends Error {
  retry: () => Promise<unknown>;
}
const isRetryableError = (error: unknown): error is IRetryableError =>
  error instanceof Error && typeof (error as Partial<IRetryableError>).retry === 'function';

const IRetryQueueToken = new SingleToken<RetryQueue>('IRetryQueue');

@register(IRetryQueueToken, scope((s) => s.hasTag('application')), singleton())
class RetryQueue {
  private errors: IRetryableError[] = [];

  get size(): number {
    return this.errors.length;
  }

  file(error: IRetryableError): void {
    this.errors.push(error);
  }

  /** Replays and drops every filed error the predicate accepts. */
  async retry(predicate: (error: IRetryableError) => boolean): Promise<void> {
    const matched = this.errors.filter(predicate);
    // Drop before replaying, so a replay that fails again is filed fresh.
    this.errors = this.errors.filter((e) => !matched.includes(e));
    await Promise.allSettled(matched.map((e) => e.retry()));
  }
}

const retryable = () => addMethodTag('retryable');

const retrying = () =>
  decorate((instance: object, s: IContainer) => {
    const proxy: object = ProxyRegistry.getInstance().createProxy(instance, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof prop !== 'string' || !getMethodTags(target, prop).has('retryable')) return value;
        return async (...args: unknown[]) => {
          try {
            return await (value as (...a: unknown[]) => unknown).apply(target, args);
          } catch (error) {
            if (error instanceof Error && !isRetryableError(error)) {
              const retry = () => (proxy as Record<string, (...a: unknown[]) => Promise<unknown>>)[prop](...args);
              IRetryQueueToken.resolve(s).file(Object.assign(error, { retry }));
            }
            throw error;
          }
        };
      },
    });
    return proxy;
  });

// --- The application -------------------------------------------------------

class OfflineError extends Error {}

interface IConnection {
  online: boolean;
}
const IConnectionToken = new SingleToken<IConnection>('IConnection');

const IChargingServiceToken = new SingleToken<ChargingService>('IChargingService');

@register(IChargingServiceToken, retrying())
class ChargingService {
  readonly started: string[] = [];

  constructor(@inject(by(IConnectionToken)) private readonly connection: IConnection) {}

  @retryable()
  async startCharge(stationId: string): Promise<void> {
    if (!this.connection.online) throw new OfflineError(`cannot reach ${stationId}`);
    this.started.push(stationId);
  }

  async stopCharge(stationId: string): Promise<void> {
    if (!this.connection.online) throw new OfflineError(`cannot reach ${stationId}`);
  }
}

describe('Retry later', () => {
  const setup = () => {
    const connection: IConnection = { online: false };
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(RetryQueue))
      .addRegistration(R.fromClass(ChargingService))
      .addRegistration(R.fromValue(connection).bindTo(IConnectionToken));
    return { connection, charging: IChargingServiceToken.resolve(app), queue: IRetryQueueToken.resolve(app) };
  };

  it('files a failed call and replays it, with its arguments, once the cause is gone', async () => {
    const { connection, charging, queue } = setup();

    await expect(charging.startCharge('st-1')).rejects.toBeInstanceOf(OfflineError); // the caller still sees it
    expect(queue.size).toBe(1);

    connection.online = true;
    await queue.retry((e) => e instanceof OfflineError);

    expect(charging.started).toEqual(['st-1']);
    expect(queue.size).toBe(0);
  });

  it('files a replay that fails again as a fresh error', async () => {
    const { charging, queue } = setup();
    await expect(charging.startCharge('st-1')).rejects.toThrow();

    await queue.retry(() => true); // still offline

    expect(queue.size).toBe(1);
  });

  it('replays only what the predicate selects', async () => {
    const { connection, charging, queue } = setup();
    await expect(charging.startCharge('st-1')).rejects.toThrow();
    await expect(charging.startCharge('st-2')).rejects.toThrow();

    connection.online = true;
    await queue.retry((e) => e.message.includes('st-2'));

    expect(charging.started).toEqual(['st-2']);
    expect(queue.size).toBe(1);
  });

  it('leaves untagged methods alone', async () => {
    const { charging, queue } = setup();

    await expect(charging.stopCharge('st-1')).rejects.toBeInstanceOf(OfflineError);
    expect(queue.size).toBe(0);
  });
});
