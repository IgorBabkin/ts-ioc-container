import 'reflect-metadata';
import { inject } from 'ts-constructor-injector';
import { by, ProviderBuilder } from 'ts-ioc-container';
import { Context } from './context/Context';
import { IQueryHandler, request, RequestMediator } from '../lib';
import { ContainerAdapter, createContainer, EmptyType } from './di';

export class Logger extends Context<string[]> {
    addLog(log: string): void {
        const logs = this.getValue();
        this.setValue(logs.concat(log));
    }
}

class QueryHandler2 implements IQueryHandler<EmptyType, void> {
    constructor(@inject(by('Logger')) private logger: Logger) {}

    handle(query: EmptyType): Promise<void> {
        this.logger.addLog('QueryHandler2');
        return Promise.resolve(undefined);
    }
}

class QueryHandler1 implements IQueryHandler<EmptyType, void> {
    constructor(@inject(by('Logger')) private logger: Logger) {}

    handle(query: EmptyType): Promise<void> {
        this.logger.addLog('QueryHandler1');
        return Promise.resolve(undefined);
    }
}

@request('before', [QueryHandler1, QueryHandler2])
@request('after', [QueryHandler2, QueryHandler1])
class QueryHandler3 implements IQueryHandler<EmptyType, void> {
    constructor(@inject(by('Logger')) private logger: Logger) {}

    async handle(query: EmptyType): Promise<void> {
        this.logger.addLog('QueryHandler3');
    }
}

describe('RequestMediator', () => {
    it('should invoke middleware', async () => {
        const container = createContainer().register(
            ProviderBuilder.fromValue(new Logger('logger', [])).forKey('Logger').build(),
        );

        const mediator = new RequestMediator(new ContainerAdapter(container));

        await mediator.send(QueryHandler3, {});

        expect(container.resolve<Logger>('Logger').getValue()).toEqual([
            'QueryHandler1',
            'QueryHandler2',
            'QueryHandler3',
            'QueryHandler2',
            'QueryHandler1',
        ]);
    });
});
