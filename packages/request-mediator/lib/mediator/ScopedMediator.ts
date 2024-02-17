import { IQueryHandler } from '../IQueryHandler';
import { IMediator } from './IMediator';
import { Scope } from '../app/Scope';
import { IDependencyContainer } from '../di/IDependencyContainer';
import { constructor } from '../others';

export abstract class ScopedMediator<Context = unknown> implements IMediator<Context> {
  protected abstract scopes: Scope[];

  constructor(private scope: IDependencyContainer) {}

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

  protected abstract createMediator(scope: IDependencyContainer): IMediator;
}
