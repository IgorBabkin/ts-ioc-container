import 'reflect-metadata';
import { container as globalContainer, Lifecycle } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

class TsyringeBenchmarkSession {
  private userId: string | undefined;

  setCurrentUser(userId: string): void {
    this.userId = userId;
  }

  getCurrentUser(): string | undefined {
    return this.userId;
  }
}

class TsyringeBenchmarkRequestConfiguration {
  readonly baseUrl = '/api';
}

const createScopedLifecycleContainer = () => {
  const app = globalContainer.createChildContainer();

  app.register(
    'TsyringeBenchmarkRequestConfiguration',
    { useClass: TsyringeBenchmarkRequestConfiguration },
    { lifecycle: Lifecycle.Singleton },
  );

  return app;
};

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'scoped-lifecycle.tsyringe',
  name: 'Scoped lifecycle - tsyringe',
  description:
    'Creates an application child container, resolves request-local singleton sessions in nested child containers, and clears a child scope.',
  taskName: 'Story: Isolate request-scoped singleton instances',
  createTask: () => () => {
    const app = createScopedLifecycleContainer();
    const request1 = app.createChildContainer();
    const request2 = app.createChildContainer();

    request1.register(
      'TsyringeBenchmarkSession',
      { useClass: TsyringeBenchmarkSession },
      { lifecycle: Lifecycle.Singleton },
    );
    request2.register(
      'TsyringeBenchmarkSession',
      { useClass: TsyringeBenchmarkSession },
      { lifecycle: Lifecycle.Singleton },
    );

    const session1 = request1.resolve<TsyringeBenchmarkSession>('TsyringeBenchmarkSession');
    const session2 = request2.resolve<TsyringeBenchmarkSession>('TsyringeBenchmarkSession');

    session1.setCurrentUser('user-1');
    session2.setCurrentUser('user-2');
    session1.getCurrentUser();
    session2.getCurrentUser();
    request1.resolve<TsyringeBenchmarkRequestConfiguration>('TsyringeBenchmarkRequestConfiguration');
    request1.clearInstances();
  },
};
