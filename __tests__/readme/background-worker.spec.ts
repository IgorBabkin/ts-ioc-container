import 'reflect-metadata';
import { Container, inject, register, Registration as R, singleton } from '../../lib';

/**
 * Background Worker - Singleton Client, Transient Jobs
 *
 * A queue worker typically needs:
 * - A single shared QueueClient (expensive to create, holds connections)
 * - A new JobHandler per job (stateful — holds job-specific data)
 *
 * singleton() on QueueClient ensures one shared connection pool.
 * No singleton on JobHandler gives a fresh instance per resolve.
 */

@register(singleton())
class QueueClient {
  readonly connected = true;

  dequeue(): string {
    return 'job-payload';
  }
}

class JobHandler {
  readonly result: string;

  constructor(@inject('QueueClient') private queue: QueueClient) {
    this.result = this.queue.dequeue();
  }
}

describe('Background worker', () => {
  function createWorker() {
    return new Container({ tags: ['worker'] })
      .addRegistration(R.fromClass(QueueClient))
      .addRegistration(R.fromClass(JobHandler));
  }

  it('should share a single QueueClient across all job handlers', () => {
    const worker = createWorker();

    const handler1 = worker.resolve(JobHandler);
    const handler2 = worker.resolve(JobHandler);

    const client1 = worker.resolve<QueueClient>('QueueClient');
    const client2 = worker.resolve<QueueClient>('QueueClient');

    // QueueClient is a singleton — same connection shared everywhere
    expect(client1).toBe(client2);
    expect(client1.connected).toBe(true);

    // JobHandler is transient — fresh instance per job
    expect(handler1).not.toBe(handler2);
  });

  it('should inject the shared QueueClient into each JobHandler', () => {
    const worker = createWorker();

    const handler = worker.resolve(JobHandler);

    expect(handler.result).toBe('job-payload');
  });
});
