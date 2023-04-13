import 'reflect-metadata';
import {
    constructor,
    Container,
    ContainerDisposedError,
    forKey,
    IContainer,
    IInjector,
    Injector,
    ProviderBuilder,
    ProviderNotFoundError,
} from '../lib';
import { resolve } from 'ts-constructor-injector';
import { ProviderHasNoKeyError } from '../lib/core/provider/ProviderHasNoKeyError';

export class IocInjector extends Injector {
    clone(): IInjector {
        return new IocInjector();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        return resolve(container)(value, ...args);
    }
}

@forKey('logger')
class Logger {
    constructor(public topic: string) {}
}

describe('IocContainer', function () {
    function createContainer() {
        return new Container(new IocInjector());
    }

    it('should resolve dependency', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        expect(container.resolve('logger')).toBeInstanceOf(Logger);
    });

    it('should resolve unique dependency per every request', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
    });

    it('should throws an error if provider key is not defined', function () {
        const container = createContainer();

        expect(() => container.register(ProviderBuilder.fromValue(5).build())).toThrow(ProviderHasNoKeyError);
    });

    it('should dispose all providers', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        container.dispose();

        expect(container.getProviders().length).toBe(0);
    });

    it('should keep all instances', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        const logger = container.resolve<Logger>('logger');

        expect(container.getInstances()).toContain(logger);
    });

    it('should dispose all instances', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        container.resolve('logger');
        container.dispose();

        expect(container.getInstances().length).toBe(0);
    });

    it('should throw an error if provider is not registered', function () {
        const container = createContainer();

        expect(() => container.resolve('logger')).toThrowError(ProviderNotFoundError);
    });

    it('should throw an error when trying to resolve a dependency of disposed container', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        container.dispose();

        expect(() => container.resolve('logger')).toThrowError(ContainerDisposedError);
    });

    it('should throw an error when trying to register a provider of disposed container', function () {
        const container = createContainer();

        container.dispose();

        expect(() => container.register(ProviderBuilder.fromClass(Logger).build())).toThrowError(
            ContainerDisposedError,
        );
    });

    it('should keep argument for provider', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).withArgs('main').build());

        expect(container.resolve<Logger>('logger').topic).toBe('main');
    });
});