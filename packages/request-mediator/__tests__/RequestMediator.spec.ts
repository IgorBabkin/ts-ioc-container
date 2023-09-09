import 'reflect-metadata';
import { by, inject, Provider } from 'ts-ioc-container';
import { Context } from './context/Context';
import { after, before, IQueryHandler, request, RequestMediator, useCase, useService } from '../lib';
import { ContainerAdapter, createContainer, EmptyType, onDispose } from './di';

export class Logger extends Context<string[]> {
  addLog(log: string): void {
    const logs = this.getValue();
    this.setValue(logs.concat(log));
  }

  @onDispose
  async save(): Promise<void> {}
}

class QueryHandler2 implements IQueryHandler<EmptyType, void> {
  constructor(@inject(by('Logger')) private logger: Logger) {}

  handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler2');
    return Promise.resolve(undefined);
  }
}

class QueryHandler1 implements IQueryHandler<EmptyType, void> {
  constructor(@inject(by('Logger')) private logger: Logger) {}

  @before
  async before(): Promise<void> {
    this.logger.addLog('before');
  }

  handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler1');
    return Promise.resolve(undefined);
  }

  @after
  async after(): Promise<void> {
    this.logger.addLog('after');
  }
}

@request('before', [QueryHandler1, QueryHandler2])
@request('after', [QueryHandler2, QueryHandler1])
@useCase('before', [QueryHandler1])
class QueryHandler3 implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by('Logger')) private logger: Logger,
    @inject(useService(QueryHandler1)) private queryHandler: QueryHandler1,
  ) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler3');
    await this.queryHandler.handle(query);
  }
}

describe('RequestMediator', () => {
  it('should invoke middleware', async () => {
    const container = createContainer().register('Logger', Provider.fromValue(new Logger('logger', [])));

    const mediator = new RequestMediator(new ContainerAdapter(container));

    await mediator.send(QueryHandler3, {});

    expect(container.resolve<Logger>('Logger').getValue()).toMatchSnapshot();
  });
});
