import 'reflect-metadata';
import {
    constructor,
    Container,
    ContainerDisposedError,
    forKey,
    IContainer,
    IInjector,
    ProviderNotFoundError,
    Registration,
} from '../lib';
import { resolve } from 'ts-constructor-injector';
import { RegistrationMissingKeyError } from '../lib/registration/RegistrationMissingKeyError';

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

        expect(() => container.add(Registration.fromValue(5))).toThrow(RegistrationMissingKeyError);
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

        expect(() => container.resolve('logger')).toThrowError(ProviderNotFoundError);
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
        const container = createContainer().add(Registration.fromClass(Logger).withArgs('main'));

        expect(container.resolve<Logger>('logger').topic).toBe('main');
    });
});
