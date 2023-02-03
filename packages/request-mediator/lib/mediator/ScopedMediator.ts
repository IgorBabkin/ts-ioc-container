import { IContainer } from 'ts-ioc-container';
import { IQueryHandler } from '../IQueryHandler';
import { IMediator } from './IMediator';
import { constructor } from 'ts-constructor-injector';
import { Scope } from '../app/Scope';

export abstract class ScopedMediator<Context = unknown> implements IMediator<Context> {
    protected abstract scopes: Scope[];

    constructor(private scope: IContainer) {}

    async send<TQuery, TResponse>(
        QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
        query: TQuery,
        context?: Context,
    ): Promise<TResponse> {
        const scope = this.scope.createScope(this.scopes);
        try {
            const mediator = this.createMediator(scope);
            return await mediator.send(QueryHandler, query, context);
        } finally {
            scope.dispose();
        }
    }

    protected abstract createMediator(scope: IContainer): IMediator;
}
