import 'reflect-metadata';
import { container as globalContainer, Lifecycle } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

interface TsyringeBenchmarkWorkflowPlugin {
  enrich(input: string): string;
}

class TsyringeBenchmarkWorkflowSession {
  constructor(readonly requestId: string) {}
}

class TsyringeBenchmarkWorkflowAuditLog {
  readonly events: string[] = [];

  record(event: string): void {
    this.events.push(event);
  }
}

class TsyringeBenchmarkWorkflowService {
  constructor(
    private readonly session: TsyringeBenchmarkWorkflowSession,
    private readonly auditLog: TsyringeBenchmarkWorkflowAuditLog,
    private readonly plugins: TsyringeBenchmarkWorkflowPlugin[],
  ) {}

  execute(email: string): string {
    const event = this.plugins.reduce((value, plugin) => plugin.enrich(value), `${this.session.requestId}:${email}`);
    this.auditLog.record(event);
    return event;
  }
}

class TsyringeBenchmarkWorkflowDomainPlugin implements TsyringeBenchmarkWorkflowPlugin {
  enrich(input: string): string {
    return `${input}:domain`;
  }
}

class TsyringeBenchmarkWorkflowAuditPlugin implements TsyringeBenchmarkWorkflowPlugin {
  enrich(input: string): string {
    return `${input}:audit`;
  }
}

const createCrossRequestWorkflowContainer = () => {
  const app = globalContainer.createChildContainer();

  app.register(
    'TsyringeBenchmarkWorkflowAuditLog',
    { useClass: TsyringeBenchmarkWorkflowAuditLog },
    { lifecycle: Lifecycle.Singleton },
  );
  app.register('TsyringeBenchmarkWorkflowPluginGroup', { useClass: TsyringeBenchmarkWorkflowDomainPlugin });
  app.register('TsyringeBenchmarkWorkflowPluginGroup', { useClass: TsyringeBenchmarkWorkflowAuditPlugin });

  return app;
};

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'cross-request-workflow.tsyringe',
  name: 'Cross request workflow - tsyringe',
  description:
    'Combines child-container lifecycle, singleton providers, factory registration, multi-token resolution, and request arguments.',
  taskName: 'Story: Resolve a request workflow across specs',
  createTask: () => () => {
    const app = createCrossRequestWorkflowContainer();
    const request = app.createChildContainer();

    request.register('TsyringeBenchmarkWorkflowSession', {
      useValue: new TsyringeBenchmarkWorkflowSession('request-1'),
    });
    request.register('TsyringeBenchmarkWorkflowService', {
      useFactory: (scope) =>
        new TsyringeBenchmarkWorkflowService(
          scope.resolve<TsyringeBenchmarkWorkflowSession>('TsyringeBenchmarkWorkflowSession'),
          scope.resolve<TsyringeBenchmarkWorkflowAuditLog>('TsyringeBenchmarkWorkflowAuditLog'),
          scope.resolveAll<TsyringeBenchmarkWorkflowPlugin>('TsyringeBenchmarkWorkflowPluginGroup'),
        ),
    });

    const service = request.resolve<TsyringeBenchmarkWorkflowService>('TsyringeBenchmarkWorkflowService');

    service.execute('admin@example.com');
    request.resolve<TsyringeBenchmarkWorkflowAuditLog>('TsyringeBenchmarkWorkflowAuditLog');
    request.clearInstances();
  },
};
