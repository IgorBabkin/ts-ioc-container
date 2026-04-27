import { Container, register, Registration as R, singleton } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

@register(singleton())
class TsIocBenchmarkAuditLog {
  readonly events: string[] = [];

  record(event: string): void {
    this.events.push(event);
  }
}

class TsIocBenchmarkCreateUser {
  constructor(private readonly auditLog: TsIocBenchmarkAuditLog) {}

  execute(email: string): string[] {
    this.auditLog.record(`created:${email}`);
    return this.auditLog.events;
  }
}

const createDependencyResolutionContainer = () =>
  new Container()
    .addRegistration(R.fromClass(TsIocBenchmarkAuditLog))
    .addRegistration(
      R.fromFn((container) => new TsIocBenchmarkCreateUser(container.resolve('TsIocBenchmarkAuditLog'))).bindToKey(
        'TsIocBenchmarkCreateUser',
      ),
    );

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'dependency-resolution.ts-ioc-container',
  name: 'Dependency resolution - ts-ioc-container',
  description:
    'Creates a container, resolves a service with an audit-log dependency, executes it, and resolves the singleton.',
  taskName: 'Story: Resolve a registered dependency',
  createTask: () => () => {
    const container = createDependencyResolutionContainer();
    const service = container.resolve<TsIocBenchmarkCreateUser>('TsIocBenchmarkCreateUser');

    service.execute('admin@example.com');
    container.resolve<TsIocBenchmarkAuditLog>('TsIocBenchmarkAuditLog');
  },
};
