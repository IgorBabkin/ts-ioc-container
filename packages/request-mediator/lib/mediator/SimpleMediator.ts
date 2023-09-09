import { IMediator } from './IMediator';
import { IQueryHandler } from '../IQueryHandler';
import { constructor } from '../others';
import { IDependencyContainer } from '../di/IDependencyContainer';
import { getHooks, hook } from '../hook';

export class SimpleMediator implements IMediator {
  constructor(private scope: IDependencyContainer) {}

  async send<TResponse, TQuery>(
    QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
    query: TQuery,
  ): Promise<TResponse> {
    const useCase = this.scope.resolve(QueryHandler);

    for (const methodName of getHooks(useCase, 'SimpleMediator/BeforeHook')) {
      // @ts-ignore
      await useCase[methodName](query);
    }

    const result = await useCase.handle(query);

    for (const methodName of getHooks(useCase, 'SimpleMediator/AfterHook')) {
      // @ts-ignore
      await useCase[methodName](query, result);
    }

    return result;
  }
}

export const before = hook('SimpleMediator/BeforeHook');
export const after = hook('SimpleMediator/AfterHook');
