import { Scope } from './Scope';
import { IContainer } from 'ts-ioc-container';
import { IMediator } from '../mediator/IMediator';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { UseCaseMediator } from './UseCaseMediator';
import { constructor, getProp, prop } from 'ts-constructor-injector';
import { IQueryHandler } from '../IQueryHandler';

const createMetadataKey = <K extends keyof IHook>(key: K) => `RequestMediator/${key}`;

export class RequestMediator extends ScopedMediator implements IHooksRepo {
    static getHooks<TQuery, K extends keyof IHook>(
        UseCase: constructor<IQueryHandler<TQuery, unknown>>,
        key: K,
    ): IHook[K] | undefined {
        return getProp(UseCase, createMetadataKey(key));
    }

    protected scopes = [Scope.Request];

    protected createMediator(scope: IContainer): IMediator {
        return new HookedMediator(new UseCaseMediator(scope), this);
    }

    getAfterHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return RequestMediator.getHooks(UseCase, 'after') ?? [];
    }

    getBeforeHooks<TQuery, TResponse>(
        UseCase: constructor<IQueryHandler<TQuery, TResponse>>,
    ): constructor<IQueryHandler<TQuery, void>>[] {
        return RequestMediator.getHooks(UseCase, 'before') ?? [];
    }
}

export function request<K extends keyof IHook>(key: K, value: IHook[K]) {
    return prop(createMetadataKey(key), value);
}
