import { Container, FunctionToken, Registration as R, setArgsFn, singleton, toGroupAlias } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

const TsIocBenchmarkWorkflowPluginGroup = toGroupAlias<TsIocBenchmarkWorkflowPlugin>(
  'TsIocBenchmarkWorkflowPluginGroup',
);

interface TsIocBenchmarkWorkflowPlugin {
  enrich(input: string): string;
}

class TsIocBenchmarkWorkflowSession {
  constructor(readonly requestId: string) {}
}

class TsIocBenchmarkWorkflowAuditLog {
  readonly events: string[] = [];

  record(event: string): void {
    this.events.push(event);
  }
}

class TsIocBenchmarkWorkflowService {
  constructor(
    private readonly session: TsIocBenchmarkWorkflowSession,
    private readonly auditLog: TsIocBenchmarkWorkflowAuditLog,
    private readonly plugins: TsIocBenchmarkWorkflowPlugin[],
  ) {}

  execute(email: string): string {
    const event = this.plugins.reduce((value, plugin) => plugin.enrich(value), `${this.session.requestId}:${email}`);
    this.auditLog.record(event);
    return event;
  }
}

class TsIocBenchmarkWorkflowDomainPlugin implements TsIocBenchmarkWorkflowPlugin {
  enrich(input: string): string {
    return `${input}:domain`;
  }
}

class TsIocBenchmarkWorkflowAuditPlugin implements TsIocBenchmarkWorkflowPlugin {
  enrich(input: string): string {
    return `${input}:audit`;
  }
}

const createCrossRequestWorkflowContainer = () =>
  new Container({ tags: ['application'] })
    .addRegistration(
      R.fromClass(TsIocBenchmarkWorkflowSession)
        .bindToKey('TsIocBenchmarkWorkflowSession')
        .when((container) => container.hasTag('request'))
        .pipe(
          setArgsFn((_, { args = [] } = {}) => args),
          singleton(),
        ),
    )
    .addRegistration(
      R.fromClass(TsIocBenchmarkWorkflowAuditLog).bindToKey('TsIocBenchmarkWorkflowAuditLog').pipe(singleton()),
    )
    .addRegistration(
      R.fromClass(TsIocBenchmarkWorkflowDomainPlugin)
        .bindToKey('TsIocBenchmarkWorkflowDomainPlugin')
        .bindTo(TsIocBenchmarkWorkflowPluginGroup),
    )
    .addRegistration(
      R.fromClass(TsIocBenchmarkWorkflowAuditPlugin)
        .bindToKey('TsIocBenchmarkWorkflowAuditPlugin')
        .bindTo(TsIocBenchmarkWorkflowPluginGroup),
    )
    .addRegistration(
      R.fromFn(
        (scope, { args = [] } = {}) =>
          new TsIocBenchmarkWorkflowService(
            scope.resolve('TsIocBenchmarkWorkflowSession', { args }),
            scope.resolve('TsIocBenchmarkWorkflowAuditLog'),
            TsIocBenchmarkWorkflowPluginGroup.resolve(scope),
          ),
      ).bindToKey('TsIocBenchmarkWorkflowService'),
    );

const requestIdToken = new FunctionToken((scope, { args = [] } = {}) => {
  scope.resolve<TsIocBenchmarkWorkflowSession>('TsIocBenchmarkWorkflowSession', { args });
  return args[0] ?? 'request';
});

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'cross-request-workflow.ts-ioc-container',
  name: 'Cross request workflow - ts-ioc-container',
  description:
    'Combines scoped lifecycle, singleton providers, factory registration, group aliases, and function token resolution.',
  taskName: 'Story: Resolve a request workflow across specs',
  createTask: () => () => {
    const app = createCrossRequestWorkflowContainer();
    const request = app.createScope({ tags: ['request'] });

    requestIdToken.resolve(request, { args: ['request-1'] });
    const service = request.resolve<TsIocBenchmarkWorkflowService>('TsIocBenchmarkWorkflowService', {
      args: ['request-1'],
    });

    service.execute('admin@example.com');
    request.resolve<TsIocBenchmarkWorkflowAuditLog>('TsIocBenchmarkWorkflowAuditLog');
    request.dispose();
  },
};
