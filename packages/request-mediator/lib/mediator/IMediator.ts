import { IQueryHandler } from '../IQueryHandler';
import { constructor } from '../others';

export interface IMediator<Context = unknown> {
    send<TQuery, TResponse>(
        QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
        query: TQuery,
        context?: Context,
    ): Promise<TResponse>;
}

export interface WithMediator {
    mediator: IMediator;
}
