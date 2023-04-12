import 'reflect-metadata';
import {
    asSingleton,
    AsyncMethodReflector,
    by,
    constructor,
    Container,
    forKey,
    IContainer,
    IInjector,
    Injector,
    MethodReflector,
    ProviderBuilder,
} from '../lib';
import { inject, resolve } from 'ts-constructor-injector';

const onConstructReflector = new MethodReflector('onConstruct');
const onConstruct = onConstructReflector.createMethodHookDecorator();

const onDisposeReflector = new AsyncMethodReflector('onDispose');
const onDispose = onDisposeReflector.createMethodHookDecorator();

export class IocInjector extends Injector {
    clone(): IInjector {
        return new IocInjector();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        const instance = resolve(container)(value, ...args);
        onConstructReflector.invokeHooksOf(instance);
        return instance;
    }
}

@asSingleton
@forKey('logsRepo')
class LogsRepo {
    savedLogs: string[] = [];
    saveLogs(messages: string[]) {
        this.savedLogs.push(...messages);
    }
}

@forKey('logger')
class Logger {
    isReady = false;
    private messages: string[] = [];
    constructor(@inject(by('logsRepo')) private logsRepo: LogsRepo) {}

    @onConstruct
    initialize() {
        this.isReady = true;
    }

    log(message: string): void {
        this.messages.push(message);
    }

    @onDispose
    async save(): Promise<void> {
        this.logsRepo.saveLogs(this.messages);
        this.messages = [];
    }
}

describe('Hooks', function () {
    function createContainer() {
        return new Container(new IocInjector());
    }

    it('should invoke hooks on all instances', async function () {
        const container = createContainer()
            .register(ProviderBuilder.fromClass(Logger).build())
            .register(ProviderBuilder.fromClass(LogsRepo).build());

        const logger = container.resolve<Logger>('logger');
        logger.log('Hello');

        for (const instance of container.getInstances()) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            await onDisposeReflector.invokeHooksOf(instance as object);
        }

        expect(container.resolve<LogsRepo>('logsRepo').savedLogs).toContain('Hello');
    });

    it('should make logger be ready on resolve', function () {
        const container = createContainer()
            .register(ProviderBuilder.fromClass(Logger).build())
            .register(ProviderBuilder.fromClass(LogsRepo).build());

        const logger = container.resolve<Logger>('logger');

        expect(logger.isReady).toBe(true);
    });
});
