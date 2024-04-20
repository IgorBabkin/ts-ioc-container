import { IMediator } from '../IMediator';
import { IQueryHandler } from '../../IQueryHandler';
import { isTransaction, ITransactionContext, ITransactionContextKey } from './ITransactionContext';
import { constructor } from '../../others';
import { IDependencyContainer } from '../../di/IDependencyContainer';

export interface ITransaction {
  transaction?: boolean;
}

export class TransactionMediator implements IMediator<ITransaction> {
  constructor(
    private mediator: IMediator,
    private scope: IDependencyContainer,
  ) {}

  async send<TResponse, TQuery>(
    QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
    query: TQuery,
    options: ITransaction = {},
  ): Promise<TResponse> {
    if (options.transaction || isTransaction(QueryHandler)) {
      const parentContext = this.scope.resolve<ITransactionContext>(ITransactionContextKey);
      try {
        return await parentContext.execute((childContext) => {
          this.scope.registerValue(ITransactionContextKey, childContext);
          return this.mediator.send(QueryHandler, query);
        });
      } finally {
        this.scope.registerValue(ITransactionContextKey, parentContext);
      }
    }

    return this.mediator.send(QueryHandler, query);
  }
}
