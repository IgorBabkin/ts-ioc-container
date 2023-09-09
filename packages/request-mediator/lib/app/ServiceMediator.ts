import { Scope } from './Scope';
import { IMediator } from '../mediator/IMediator';
import { ITransaction, TransactionMediator } from '../mediator/transaction/TransactionMediator';
import { SimpleMediator } from '../mediator/SimpleMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { IQueryHandler } from '../IQueryHandler';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { getProp, prop } from '../metadata';
import { constructor } from '../others';
import { IDependencyContainer } from '../di/IDependencyContainer';
import { Resolvable } from 'ts-ioc-container';

export const IServiceMediatorKey = Symbol('IServiceMediator');
const createMetadataKey = <K extends keyof IHook>(key: K) => `RequestMediator/${key}`;

export class ServiceMediator extends ScopedMediator<ITransaction> implements IHooksRepo {
  protected scopes = [Scope.Service];

  protected createMediator(scope: IDependencyContainer): IMediator {
    return new TransactionMediator(new HookedMediator(new SimpleMediator(scope), this), scope);
  }

  getAfterHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[] {
    return getProp(UseCase, createMetadataKey('after')) ?? [];
  }

  getBeforeHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[] {
    return getProp(UseCase, createMetadataKey('before')) ?? [];
  }
}

export function useService<TQuery, TResponse>(
  Service: constructor<IQueryHandler<TQuery, TResponse>>,
  context?: ITransaction,
) {
  return (useCaseScope: Resolvable) =>
    new ServiceDecorator(useCaseScope.resolve(IServiceMediatorKey), Service, context);
}

class ServiceDecorator<TQuery, TResponse> implements IQueryHandler<TQuery, TResponse> {
  constructor(
    private mediator: IMediator,
    private Service: constructor<IQueryHandler<TQuery, TResponse>>,
    private options: ITransaction = {},
  ) {}

  handle(query: TQuery): Promise<TResponse> {
    return this.mediator.send(this.Service, query, this.options);
  }
}
