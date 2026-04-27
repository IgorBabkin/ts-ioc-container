import { Container, register, Registration as R, scope, singleton } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

@register(scope((container) => container.hasTag('request')), singleton())
class TsIocBenchmarkSession {
  private userId: string | undefined;

  setCurrentUser(userId: string): void {
    this.userId = userId;
  }

  getCurrentUser(): string | undefined {
    return this.userId;
  }
}

class TsIocBenchmarkRequestConfiguration {
  readonly baseUrl = '/api';
}

const createScopedLifecycleContainer = () =>
  new Container({ tags: ['application'] })
    .addRegistration(R.fromClass(TsIocBenchmarkSession))
    .addRegistration(R.fromClass(TsIocBenchmarkRequestConfiguration));

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'scoped-lifecycle.ts-ioc-container',
  name: 'Scoped lifecycle - ts-ioc-container',
  description:
    'Creates an application container, resolves scoped singleton sessions in request scopes, and disposes a child scope.',
  taskName: 'Story: Isolate request-scoped singleton instances',
  createTask: () => () => {
    const app = createScopedLifecycleContainer();
    const request1 = app.createScope({ tags: ['request'] });
    const request2 = app.createScope({ tags: ['request'] });

    const session1 = request1.resolve<TsIocBenchmarkSession>('TsIocBenchmarkSession');
    const session2 = request2.resolve<TsIocBenchmarkSession>('TsIocBenchmarkSession');

    session1.setCurrentUser('user-1');
    session2.setCurrentUser('user-2');
    session1.getCurrentUser();
    session2.getCurrentUser();
    request1.resolve<TsIocBenchmarkRequestConfiguration>('TsIocBenchmarkRequestConfiguration');
    request1.dispose();
  },
};
