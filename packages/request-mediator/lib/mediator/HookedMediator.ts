import { IQueryHandler } from '../IQueryHandler';
import { IMediator } from './IMediator';
import { constructor } from '../others';

export interface IHooksRepo {
  getBeforeHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[];

  getAfterHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[];
}

export class HookedMediator implements IMediator {
  constructor(private mediator: IMediator, private hooksRepo: IHooksRepo) {}

  async send<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    query: TQuery,
  ): Promise<TResponse> {
    for (const QueryHandler of this.hooksRepo.getBeforeHooks(UseCase)) {
      await this.mediator.send(QueryHandler, query);
    }

    const result = await this.mediator.send(UseCase, query);

    for (const QueryHandler of this.hooksRepo.getAfterHooks(UseCase)) {
      await this.mediator.send(QueryHandler, query);
    }

    return result;
  }
}

export interface IHook {
  before: constructor<IQueryHandler<unknown, void>>[];
  after: constructor<IQueryHandler<unknown, void>>[];
}
