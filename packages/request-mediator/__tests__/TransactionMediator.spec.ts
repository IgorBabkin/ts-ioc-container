import 'reflect-metadata';
import { by, inject, key, provider, register, Registration as R, scope, singleton } from 'ts-ioc-container';
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
import { ILoggerKey, Logger } from './Logger';

let id = 0;

@register(key('Repo'), scope((s) => s.hasTag(Scope.Request)))
@provider(singleton())
class Repo {
  private entities: string[] = [];
  private id = id;
  constructor(
    @inject((s) => () => s.resolve(ITransactionContextKey)) private getTransaction: () => TransactionContext,
    @inject(by.key(ILoggerKey)) private logger: Logger,
  ) {
    id++;
  }

  async findById(): Promise<void> {
    const transaction = this.getTransaction();
    this.entities.push('todo');
    this.logger.addLog(
      `Repo (${this.id}) -> findById [transactionId: ${transaction.id.toString()}], entities: ${this.entities.join(', ')}`,
    );
  }

  async persist(): Promise<void> {
    const transaction = this.getTransaction();
    this.logger.addLog(
      `Repo (${this.id}) -> persist [transactionId: ${transaction.id.toString()}], entities: ${this.entities.join(', ')}`,
    );
  }
}

class TransactionContext implements ITransactionContext {
  constructor(public id = 0) {}

  execute<Response>(fn: (context: ITransactionContext) => Promise<Response>): Promise<Response> {
    return fn(new TransactionContext(this.id + 1));
  }
}

@transaction
class AfterHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by.key(ILoggerKey)) private logger: Logger,
    @inject(by.key('Repo')) private repo: Repo,
    @inject(by.key(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog(`AfterHandler - transactionId: ${this.transactionContext.id.toString()}`);
    await this.repo.persist();
  }
}

class BeforeHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by.key(ILoggerKey)) private logger: Logger,
    @inject(by.key(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(): Promise<void> {
    this.logger.addLog(`BeforeHandler - transactionId: ${this.transactionContext.id.toString()}`);
  }
}

@request('before', [BeforeHandler])
@request('after', [AfterHandler])
class QueryHandler implements IQueryHandler<EmptyType, void> {
  constructor(
    @inject(by.key(ILoggerKey)) private logger: Logger,
    @inject(by.key('Repo')) private repo: Repo,
    @inject(by.key(ITransactionContextKey)) private transactionContext: TransactionContext,
  ) {}

  async handle(query: EmptyType): Promise<void> {
    this.logger.addLog(`QueryHandler - transactionId: ${this.transactionContext.id.toString()}`);
    await this.repo.findById();
  }
}

@register(key(ITransactionContextKey), scope((s) => s.hasTag(Scope.Application)))
@provider(singleton())
class TestTransaction implements ITransactionContext {
  constructor(private id: number = 0) {}

  execute<Response>(fn: (context: ITransactionContext) => Promise<Response>): Promise<Response> {
    return fn(new TestTransaction(this.id + 1));
  }
}

describe('TransactionMediator', () => {
  it('should invoke middleware', async () => {
    const container = createContainer()
      .add(R.fromClass(Logger))
      .add(R.fromClass(TestTransaction))
      .add(R.fromClass(Repo));

    const mediator = new RequestMediator(new ContainerAdapter(container));

    await mediator.send(QueryHandler, {});

    expect(container.resolve<Logger>(ILoggerKey).getLogs()).toMatchSnapshot();
  });
});
