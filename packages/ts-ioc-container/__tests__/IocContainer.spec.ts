import 'reflect-metadata';
import {
    withArgs,
    constructor,
    Container,
    ContainerDisposedError,
    DependencyMissingKeyError,
    DependencyNotFoundError,
    forKey,
    IContainer,
    IInjector,
    Provider,
    provider,
    Registration,
    asSingleton,
} from '../lib';
import { resolve } from 'ts-constructor-injector';

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(container)(value, ...deps);
    },
};

@forKey('logger')
class Logger {
    constructor(public topic: string) {}
}

describe('IocContainer', function () {
    function createContainer() {
        return new Container(injector);
    }

    it('should resolve dependency', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        expect(container.resolve('logger')).toBeInstanceOf(Logger);
    });

    it('should resolve unique dependency per every request', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
    });

    it('should throws an error if provider key is not defined', function () {
        const container = createContainer();

        class TestClass {}

        expect(() => container.add(Registration.fromClass(TestClass))).toThrow(DependencyMissingKeyError);
    });

    it('should keep all instances', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        const logger = container.resolve<Logger>('logger');

        expect(container.getInstances()).toContain(logger);
    });

    it('should dispose all instances', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        container.resolve('logger');
        container.dispose();

        expect(container.getInstances().length).toBe(0);
    });

    it('should throw an error if provider is not registered', function () {
        const container = createContainer();

        expect(() => container.resolve('logger')).toThrowError(DependencyNotFoundError);
    });

    it('should throw an error when trying to resolve a dependency of disposed container', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        container.dispose();

        expect(() => container.resolve('logger')).toThrowError(ContainerDisposedError);
    });

    it('should throw an error when trying to register a provider of disposed container', function () {
        const container = createContainer();

        container.dispose();

        expect(() => container.add(Registration.fromClass(Logger))).toThrowError(ContainerDisposedError);
    });

    it('should keep argument for provider', function () {
        const container = createContainer().add(Registration.fromClass(Logger).map(withArgs('main')));

        expect(container.resolve<Logger>('logger').topic).toBe('main');
    });

    it('should use builder decorators', function () {
        @provider(asSingleton())
        class Logger1 {}

        const container = createContainer().register('logger', Provider.fromClass(Logger1));

        expect(container.resolve('logger')).toBe(container.resolve('logger'));
    });
});
