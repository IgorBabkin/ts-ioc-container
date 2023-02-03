import { IMediator } from '../IMediator';
import { constructor, fromValue, IContainer } from 'ts-ioc-container';
import { IQueryHandler } from '../../IQueryHandler';
import { isTransaction, ITransactionContext, ITransactionContextKey } from './ITransactionContext';

export interface ITransaction {
    transaction?: boolean;
}

export class TransactionMediator implements IMediator<ITransaction> {
    constructor(private mediator: IMediator, private scope: IContainer) {}

    async send<TResponse, TQuery>(
        QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
        query: TQuery,
        options: ITransaction = {},
    ): Promise<TResponse> {
        if (options.transaction || isTransaction(QueryHandler)) {
            const transactionContext = this.scope.resolve<ITransactionContext>(ITransactionContextKey);
            return transactionContext.execute((childTransactionContext) => {
                this.scope.register(fromValue(childTransactionContext).forKey(ITransactionContextKey).build());
                return this.mediator.send(QueryHandler, query);
            });
        }

        return this.mediator.send(QueryHandler, query);
    }
}
