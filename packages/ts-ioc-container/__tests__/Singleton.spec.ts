import 'reflect-metadata';
import { asSingleton, constructor, Container, forKey, fromClass, IContainer, IInjector } from '../lib';
import { resolve } from 'ts-constructor-injector';

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(container)(value, ...deps);
    },
};

@asSingleton()
@forKey('logger')
class Logger {}

describe('Singleton', function () {
    function createContainer() {
        return new Container(injector);
    }

    it('should resolve the same container per every request', function () {
        const container = createContainer().add(fromClass(Logger));

        expect(container.resolve('logger')).toBe(container.resolve('logger'));
    });

    it('should resolve different dependency per scope', function () {
        const container = createContainer().add(fromClass(Logger));
        const child = container.createScope();

        expect(container.resolve('logger')).not.toBe(child.resolve('logger'));
    });

    it('should resolve the same dependency for scope', function () {
        const container = createContainer().add(fromClass(Logger));
        const child = container.createScope();

        expect(child.resolve('logger')).toBe(child.resolve('logger'));
    });
});
