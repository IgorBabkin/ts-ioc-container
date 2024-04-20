import { Scope } from './Scope';
import { IMediator } from '../mediator/IMediator';
import { createHookMetadataKey, HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { getProp, prop } from '../metadata';
import { constructor } from '../others';
import { IQueryHandler } from '../IQueryHandler';
import { IDependencyContainer } from '../di/IDependencyContainer';
import { SimpleMediator } from '../mediator/SimpleMediator';
import { TransactionMediator } from '../mediator/transaction/TransactionMediator';

export class RequestMediator extends ScopedMediator implements IHooksRepo {
  protected scopes = [Scope.Request];

  protected createMediator(scope: IDependencyContainer): IMediator {
    return new HookedMediator(new TransactionMediator(new SimpleMediator(scope), scope), this);
  }

  getAfterHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[] {
    return getProp(UseCase, createHookMetadataKey('RequestMediator/', 'after')) ?? [];
  }

  getBeforeHooks<TQuery, TResponse>(
    UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
  ): constructor<IQueryHandler<TQuery, void>>[] {
    return getProp(UseCase, createHookMetadataKey('RequestMediator/', 'before')) ?? [];
  }
}

export function request<K extends keyof IHook>(key: K, value: IHook[K]) {
  return prop(createHookMetadataKey('RequestMediator/', key), value);
}
