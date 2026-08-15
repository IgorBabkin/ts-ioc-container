import 'reflect-metadata';
import { container as globalContainer, Lifecycle } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

class TsyringeBenchmarkAuditLog {
  readonly events: string[] = [];

  record(event: string): void {
    this.events.push(event);
  }
}

class TsyringeBenchmarkCreateUser {
  constructor(private readonly auditLog: TsyringeBenchmarkAuditLog) {}

  execute(email: string): string[] {
    this.auditLog.record(`created:${email}`);
    return this.auditLog.events;
  }
}

const createDependencyResolutionContainer = () => {
  const container = globalContainer.createChildContainer();

  container.register(
    'TsyringeBenchmarkAuditLog',
    { useClass: TsyringeBenchmarkAuditLog },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register('TsyringeBenchmarkCreateUser', {
    useFactory: (container) =>
      new TsyringeBenchmarkCreateUser(container.resolve<TsyringeBenchmarkAuditLog>('TsyringeBenchmarkAuditLog')),
  });

  return container;
};

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'dependency-resolution.tsyringe',
  name: 'Dependency resolution - tsyringe',
  description:
    'Creates a child container, resolves a service with an audit-log dependency, executes it, and resolves the singleton.',
  taskName: 'Story: Resolve a registered dependency',
  createTask: () => () => {
    const container = createDependencyResolutionContainer();
    const service = container.resolve<TsyringeBenchmarkCreateUser>('TsyringeBenchmarkCreateUser');

    service.execute('admin@example.com');
    container.resolve<TsyringeBenchmarkAuditLog>('TsyringeBenchmarkAuditLog');
  },
};
