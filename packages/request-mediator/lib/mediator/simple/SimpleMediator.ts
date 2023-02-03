import { IMediator } from '../IMediator';
import { IQueryHandler } from '../../IQueryHandler';
import { constructor } from 'ts-constructor-injector';
import { AsyncMethodsMetadataCollector } from './AsyncMethodsMetadataCollector';
import { IContainer } from '../../di/IContainer';
import { createMethodHookDecorator } from './IAsyncMethodsMetadataCollector';

const onBeforeMetadataCollector = new AsyncMethodsMetadataCollector(Symbol('SimpleMediator/BeforeHook'));
const onAfterMetadataCollector = new AsyncMethodsMetadataCollector(Symbol('SimpleMediator/AfterHook'));

export class SimpleMediator implements IMediator {
    constructor(private scope: IContainer) {}

    async send<TResponse, TQuery>(
        QueryHandler: constructor<IQueryHandler<TQuery, TResponse>>,
        query: TQuery,
    ): Promise<TResponse> {
        const useCase = this.scope.resolve(QueryHandler);
        await onBeforeMetadataCollector.invokeHooksOf(QueryHandler, query);
        const result = await useCase.handle(query);
        await onAfterMetadataCollector.invokeHooksOf(QueryHandler, query, result);
        return result;
    }
}

export const before = createMethodHookDecorator(onBeforeMetadataCollector);
export const after = createMethodHookDecorator(onBeforeMetadataCollector);
