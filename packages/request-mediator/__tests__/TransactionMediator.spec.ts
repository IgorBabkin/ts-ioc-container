import 'reflect-metadata';
import { by, key, Provider, provider, Registration, singleton, tags, inject } from 'ts-ioc-container';
import { Context } from './context/Context';
import {
  IQueryHandler,
  ITransactionContext,
  ITransactionContextKey,
  request,
  RequestMediator,
  Scope,
  transaction,
} from '../lib';
import { ContainerAdapter, createContainer, EmptyType } from './di';

export class Logger extends Context<string[]> {
  addLog(log: string): void {
    const logs = this.getValue();
    this.setValue(logs.concat(log));
  }
}

class TransactionContext implements ITransactionContext {
  constructor(public id = 0) {}

  execute<Response>(fn: (context: ITransactionContext) => Promise<Response>): Promise<Response> {
    return fn(new TransactionContext(this.id + 1));
  }
}

class AfterHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by('Logger')) private logger: Logger,
    @inject(by(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog(this.transactionContext.id.toString());
    this.logger.addLog('AfterHandler');
  }
}

class BeforeHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by('Logger')) private logger: Logger,
    @inject(by(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(): Promise<void> {
    this.logger.addLog(this.transactionContext.id.toString());
    this.logger.addLog('BeforeHandler');
  }
}

@transaction
@request('before', [BeforeHandler])
@request('after', [AfterHandler])
class QueryHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by('Logger')) private logger: Logger,
    @inject(by(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog(this.transactionContext.id.toString());
    this.logger.addLog('QueryHandler');
  }
}

@key(ITransactionContextKey)
@provider(singleton(), tags(Scope.Application))
class TestTransaction implements ITransactionContext {
  constructor(private id: number = 0) {}

  execute<Response>(fn: (context: ITransactionContext) => Promise<Response>): Promise<Response> {
    return fn(new TestTransaction(this.id + 1));
  }
}

describe('RequestMediator', () => {
  it('should invoke middleware', async () => {
    const logger = new Logger('logger', []);
    const container = createContainer()
      .register('Logger', Provider.fromValue(logger))
      .add(Registration.fromClass(TestTransaction));

    const mediator = new RequestMediator(new ContainerAdapter(container));

    await mediator.send(QueryHandler, {});

    expect(logger.getValue()).toEqual(['0', 'BeforeHandler', '1', 'QueryHandler', '0', 'AfterHandler']);
  });
});
