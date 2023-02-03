import { Scope } from './Scope';
import { fromValue, IContainer } from 'ts-ioc-container';
import { IMediator } from '../mediator/IMediator';
import { ITransaction, TransactionMediator } from '../mediator/transaction/TransactionMediator';
import { SimpleMediator } from '../mediator/simple/SimpleMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { IServiceMediatorKey, ServiceMediator } from './ServiceMediator';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { constructor, getProp, prop } from 'ts-constructor-injector';
import { IQueryHandler } from '../IQueryHandler';

const createMetadataKey = <K extends keyof IHook>(key: K) => `UseCaseMediator/${key}`;

export class UseCaseMediator extends ScopedMediator<ITransaction> implements IHooksRepo {
    static getHooks<TQuery, K extends keyof IHook>(
        UseCase: constructor<IQueryHandler<TQuery, unknown>>,
        key: K,
    ): IHook[K] | undefined {
        return getProp(UseCase, createMetadataKey(key));
    }

    protected scopes = [Scope.UseCase];

    protected createMediator(scope: IContainer): IMediator {
        scope.register(fromValue(new ServiceMediator(scope)).forKey(IServiceMediatorKey).build());
        return new TransactionMediator(new HookedMediator(new SimpleMediator(scope), this), scope);
    }

    getAfterHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return UseCaseMediator.getHooks(UseCase, 'after') ?? [];
    }

    getBeforeHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return UseCaseMediator.getHooks(UseCase, 'before') ?? [];
    }
}

export function useCase<K extends keyof IHook>(key: K, value: IHook[K]) {
    return prop(createMetadataKey(key), value);
}
