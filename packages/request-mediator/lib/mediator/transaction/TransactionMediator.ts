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
      const transactionContext = this.scope.resolve<ITransactionContext>(ITransactionContextKey);
      return transactionContext.execute((childTransactionContext) => {
        this.scope.registerValue(ITransactionContextKey, childTransactionContext);
        return this.mediator.send(QueryHandler, query);
      });
    }

    return this.mediator.send(QueryHandler, query);
  }
}
