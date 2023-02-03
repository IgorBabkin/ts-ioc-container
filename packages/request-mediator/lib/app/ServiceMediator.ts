import { Scope } from './Scope';
import { IContainer, Resolveable } from 'ts-ioc-container';
import { IMediator } from '../mediator/IMediator';
import { ITransaction, TransactionMediator } from '../mediator/transaction/TransactionMediator';
import { SimpleMediator } from '../mediator/simple/SimpleMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { IQueryHandler } from '../IQueryHandler';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { constructor, getProp, prop } from 'ts-constructor-injector';

export const IServiceMediatorKey = Symbol('IServiceMediator');
const createMetadataKey = <K extends keyof IHook>(key: K) => `RequestMediator/${key}`;

export class ServiceMediator extends ScopedMediator<ITransaction> implements IHooksRepo {
    static getHooks<TQuery, K extends keyof IHook>(
        UseCase: constructor<IQueryHandler<TQuery, unknown>>,
        key: K,
    ): IHook[K] | undefined {
        return getProp(UseCase, createMetadataKey(key));
    }

    protected scopes = [Scope.Service];

    protected createMediator(scope: IContainer): IMediator {
        return new TransactionMediator(new HookedMediator(new SimpleMediator(scope), this), scope);
    }

    getAfterHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return ServiceMediator.getHooks(UseCase, 'after') ?? [];
    }

    getBeforeHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return ServiceMediator.getHooks(UseCase, 'before') ?? [];
    }
}

export function service<K extends keyof IHook>(key: K, value: IHook[K]) {
    return prop(createMetadataKey(key), value);
}

export function useService<TQuery, TResponse>(
    Service: constructor<IQueryHandler<TQuery, TResponse>>,
    context?: ITransaction,
) {
    return (useCaseScope: Resolveable) =>
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
