import 'reflect-metadata';
import {
    asSingleton,
    constructor,
    Container,
    ContainerDisposedError,
    forKey,
    fromClass,
    IContainer,
    IInjector,
    perTags,
} from '../lib';
import { composeDecorators, resolve } from 'ts-constructor-injector';

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(container)(value, ...deps);
    },
};

const perHome = composeDecorators(asSingleton, perTags('home'));

@perHome
@forKey('logger')
class Logger {}

describe('Singleton', function () {
    it('should resolve the same dependency if provider registered per root', function () {
        const container = new Container(injector, { tags: ['home'] }).register(fromClass(Logger).build());

        const child1 = container.createScope();
        const child2 = container.createScope();

        expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
    });

    it('should resolve unique dependency for every registered scope', function () {
        const container = new Container(injector).register(fromClass(Logger).build());

        const child1 = container.createScope(['home']);
        const child2 = container.createScope(['home']);

        expect(child1.resolve('logger')).not.toBe(child2.resolve('logger'));
    });

    it('should resolve unique dependency if registered scope has another registered scope', function () {
        const container = new Container(injector, { tags: ['home'] }).register(fromClass(Logger).build());

        const child1 = container.createScope(['home']);

        expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
    });

    it('should dispose all scopes', function () {
        const container = new Container(injector).register(fromClass(Logger).build());

        const child1 = container.createScope(['home']);
        const child2 = container.createScope(['home']);

        child1.resolve('logger');
        child2.resolve('logger');

        container.dispose();

        expect(() => child1.resolve('logger')).toThrowError(ContainerDisposedError);
        expect(() => child2.resolve('logger')).toThrowError(ContainerDisposedError);
    });

    it('should collect instances from all scopes', function () {
        const container = new Container(injector).register(fromClass(Logger).build());

        const childScope1 = container.createScope(['home']);
        const childScope2 = container.createScope(['home']);

        const logger1 = childScope1.resolve('logger');
        const logger2 = childScope2.resolve('logger');
        const instances = container.getInstances();

        expect(instances).toContain(logger1);
        expect(instances).toContain(logger2);
    });

    it('should clear all instances on dispose', function () {
        const container = new Container(injector).register(fromClass(Logger).build());

        const child1 = container.createScope(['home']);
        const child2 = container.createScope(['home']);
        child1.resolve('logger');
        child2.resolve('logger');
        container.dispose();

        expect(container.getInstances().length).toBe(0);
    });
});
