import { Scope } from './Scope';
import { IMediator } from '../mediator/IMediator';
import { ITransaction, TransactionMediator } from '../mediator/transaction/TransactionMediator';
import { SimpleMediator } from '../mediator/simple/SimpleMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { IServiceMediatorKey, ServiceMediator } from './ServiceMediator';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { constructor, getProp, prop } from 'ts-constructor-injector';
import { IQueryHandler } from '../IQueryHandler';
import { IContainer } from '../di/IContainer';

const createMetadataKey = <K extends keyof IHook>(key: K) => `UseCaseMediator/${key}`;

export class UseCaseMediator extends ScopedMediator<ITransaction> implements IHooksRepo {
    protected scopes = [Scope.UseCase];

    protected createMediator(scope: IContainer): IMediator {
        scope.registerValue(IServiceMediatorKey, new ServiceMediator(scope));
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
        return getProp(UseCase, createMetadataKey('after')) ?? [];
    }
}

export function useCase<K extends keyof IHook>(key: K, value: IHook[K]) {
    return prop(createMetadataKey(key), value);
}
