import 'reflect-metadata';
import { by, inject, Registration as R } from 'ts-ioc-container';
import { after, before, IQueryHandler, request, RequestMediator } from '../lib';
import { ContainerAdapter, createContainer, EmptyType } from './di';
import { ILoggerKey, Logger } from './Logger';

class QueryHandler2 implements IQueryHandler<EmptyType, void> {
  constructor(@inject(by.key(ILoggerKey)) private logger: Logger) {}

  handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler2 -> handle');
    return Promise.resolve();
  }
}

class QueryHandler1 implements IQueryHandler<EmptyType, void> {
  constructor(@inject(by.key(ILoggerKey)) private logger: Logger) {}

  @before
  async before(): Promise<void> {
    this.logger.addLog('QueryHandler1 -> before');
  }

  handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler1 -> handle');
    return Promise.resolve();
  }

  @after
  async after(): Promise<void> {
    this.logger.addLog('QueryHandler1 -> after');
  }
}

@request('before', [QueryHandler1, QueryHandler2])
@request('after', [QueryHandler2, QueryHandler1])
class QueryHandler3 implements IQueryHandler<EmptyType, void> {
  constructor(@inject(by.key(ILoggerKey)) private logger: Logger) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog('QueryHandler3 -> handle');
  }
}

describe('RequestMediator', () => {
  it('should invoke middleware', async () => {
    const container = createContainer().add(R.fromClass(Logger));

    const mediator = new RequestMediator(new ContainerAdapter(container));

    await mediator.send(QueryHandler3, {});

    expect(container.resolve<Logger>(ILoggerKey).getLogs()).toMatchSnapshot();
  });
});
