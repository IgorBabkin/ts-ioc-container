import 'reflect-metadata';
import { by, constructor, Container, IContainer, IInjector, Registration, forKey, singleton, provider } from '../lib';
import { AsyncMethodReflector, inject, MethodReflector, resolve } from 'ts-constructor-injector';

const onConstructReflector = new MethodReflector('onConstruct');
const onConstruct = onConstructReflector.createMethodHookDecorator();

const onDisposeReflector = new AsyncMethodReflector('onDispose');
const onDispose = onDisposeReflector.createMethodHookDecorator();

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        const instance = resolve(container)(value, ...deps);
        onConstructReflector.invokeHooksOf(instance);
        return instance;
    },
};

@forKey('logsRepo')
@provider(singleton())
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
        return new Container(injector);
    }

    it('should invoke hooks on all instances', async function () {
        const container = createContainer().add(Registration.fromClass(Logger)).add(Registration.fromClass(LogsRepo));

        const logger = container.resolve<Logger>('logger');
        logger.log('Hello');

        for (const instance of container.getInstances()) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            await onDisposeReflector.invokeHooksOf(instance as object);
        }

        expect(container.resolve<LogsRepo>('logsRepo').savedLogs).toContain('Hello');
    });

    it('should make logger be ready on resolve', function () {
        const container = createContainer().add(Registration.fromClass(Logger)).add(Registration.fromClass(LogsRepo));

        const logger = container.resolve<Logger>('logger');

        expect(logger.isReady).toBe(true);
    });
});
