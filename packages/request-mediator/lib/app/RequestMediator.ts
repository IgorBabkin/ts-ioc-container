import { Scope } from './Scope';
import { IMediator } from '../mediator/IMediator';
import { HookedMediator, IHook, IHooksRepo } from '../mediator/HookedMediator';
import { ScopedMediator } from '../mediator/ScopedMediator';
import { UseCaseMediator } from './UseCaseMediator';
import { constructor, getProp, prop } from 'ts-constructor-injector';
import { IQueryHandler } from '../IQueryHandler';
import { IContainer } from '../di/IContainer';

const createMetadataKey = <K extends keyof IHook>(key: K) => `RequestMediator/${key}`;

export class RequestMediator extends ScopedMediator implements IHooksRepo {
    protected scopes = [Scope.Request];

    protected createMediator(scope: IContainer): IMediator {
        return new HookedMediator(new UseCaseMediator(scope), this);
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

export function request<K extends keyof IHook>(key: K, value: IHook[K]) {
    return prop(createMetadataKey(key), value);
}
