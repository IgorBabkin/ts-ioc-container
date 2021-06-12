import 'reflect-metadata';
import {
    IInstanceHook,
    IocInjector,
    IServiceLocator,
    OnConstructHook,
    OnDisposeHook,
    Provider,
    ServiceLocator,
    SimpleInjector,
} from '../lib';
import { App, App2, App3, App4, Logger, Logger2, Logger3, OnConstructImpl } from './fixtures/OnConstructImpl';
import { SubGroup3 } from './fixtures/SubGroup3';
import { Group } from './fixtures/Group';
import { OnDisposeImpl } from './fixtures/OnDisposeImpl';
import { IocServiceLocatorStrategyOptions } from '../lib/injector/ioc/IocInjector';
import { hooksMetadataCollector, metadataCollector } from './decorators';
import { InstanceHook } from '../lib/hooks/InstanceHook';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hooks: IInstanceHook[] = []) =>
        new ServiceLocator(new SimpleInjector(), new InstanceHook(hooks));
    const createIoCLocator = (hooks: IInstanceHook[] = [], options?: IocServiceLocatorStrategyOptions) =>
        new ServiceLocator(new IocInjector(metadataCollector, options), new InstanceHook(hooks));

    it('should create an instance', () => {
        const expectedInstance = {};

        const locator = createIoCLocator().register('key1', Provider.fromInstance(expectedInstance));

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register('key1', Provider.fromConstructor(TestClass));
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should create an instanse', () => {
        const locator = createIoCLocator().register('key1', new Provider(() => ({})));

        expect(locator.resolve('key1')).not.toBe(locator.resolve('key1'));
    });

    it('should create a singleton', () => {
        const locator = createIoCLocator().register('key1', new Provider(() => ({})).asSingleton());

        expect(locator.resolve('key1')).toBe(locator.resolve('key1'));
    });

    describe('scope', () => {
        it('should override parent', () => {
            const expectedInstance1 = {};
            const expectedInstance2 = {};

            const locator = createIoCLocator().register('key1', Provider.fromInstance(expectedInstance1));

            const child = locator.createContainer().register('key1', Provider.fromInstance(expectedInstance2));

            expect(locator.resolve('key1')).toBe(expectedInstance1);
            expect(child.resolve('key1')).toBe(expectedInstance2);
        });

        it('is available to get parent deps from child', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator().register('key1', Provider.fromInstance(expectedInstance1));

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(expectedInstance1);
        });

        it('is not available to get child deps from parent', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator();

            locator.createContainer().register('key1', Provider.fromInstance(expectedInstance1));

            expect(() => locator.resolve('key1')).toThrow();
        });

        it('returns the same singleton for child and parent', () => {
            const locator = createIoCLocator().register('key1', new Provider(() => ({})).asSingleton());

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(locator.resolve('key1'));
        });

        it('clears container', () => {
            const locator = createIoCLocator().register('key1', Provider.fromInstance({}));

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBeDefined();

            child.remove();

            expect(() => child.resolve('key1')).toThrow();
        });

        it('should invokes postConstruct', () => {
            let isPostConstructed = false;
            const locator = createSimpleLocator([
                {
                    onCreate: (instance) => instance.postConstruct(),
                    onDispose() {},
                },
            ]);
            const disposable = {
                postConstruct: () => {
                    isPostConstructed = true;
                },
            };

            const child = locator.createContainer().register('key1', Provider.fromInstance(disposable));

            child.resolve('key1');

            expect(isPostConstructed).toBeTruthy();
        });

        it('should invokes onDispose', () => {
            let isDisposed = false;
            const locator = createSimpleLocator([
                {
                    onCreate() {},
                    onDispose(instance) {
                        instance.dispose();
                    },
                },
            ]);
            const disposable = {
                dispose: () => {
                    isDisposed = true;
                },
            };

            const child = locator.createContainer().register('key1', Provider.fromInstance(disposable));

            child.resolve('key1');

            child.remove();

            expect(isDisposed).toBeTruthy();
        });

        it('should remove sub-sub-child', () => {
            const expectedInstance = { opa: '11' };

            const locator = createIoCLocator()
                .register('key1', new Provider(() => expectedInstance).asScoped())
                .register('key2', new Provider(() => ({})).asScoped());

            const child1 = locator.createContainer();
            const child2 = child1.createContainer();

            expect(child2.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key2')).not.toBe(child1.resolve('key1'));

            expect(() => locator.resolve('key1')).toThrow();

            child2.remove();
            expect(() => child2.resolve('key1')).toThrow();
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(() => locator.resolve('key1')).toThrow();
            child1.remove();

            expect(() => child1.resolve('key1')).toThrow();
            expect(() => locator.resolve('key1')).toThrow();
        });

        it('ioc1', () => {
            const expected = ['KEY1_VALUE', 'p2', 'p3', 'KEY2_VALUE', '1', '2', 'KEY1_VALUE', 'KEY2_VALUE'];

            const decorated = createIoCLocator()
                .register('key1', Provider.fromInstance('KEY1_VALUE'))
                .register('key2', Provider.fromInstance('KEY2_VALUE'))
                .register('key3', Provider.fromConstructor(SubGroup3));

            const group = decorated.resolve(Group, 'p2', 'p3');
            const result = group.privet();

            expect(result).toEqual(expected);
        });

        it('ioc2', () => {
            const expected = {};

            const locator = createIoCLocator().register('key1', new Provider(() => expected).asSingleton());

            const child1 = locator.createContainer();

            expect(child1.resolve('key1')).toEqual(locator.resolve('key1'));

            child1.remove();

            const child2 = locator.createContainer();
            expect(child2.resolve('key1')).toEqual(locator.resolve('key1'));

            child2.remove();
        });

        it('conditional resolving', () => {
            const locator = createSimpleLocator().register(
                'key1',
                new Provider((l: IServiceLocator) => (l.resolve('context') === 'a' ? 'good' : 'bad')).asScoped(),
            );

            const child1 = locator.createContainer().register('context', Provider.fromInstance('a'));
            const child2 = locator.createContainer().register('context', Provider.fromInstance('b'));

            expect(child1.resolve('key1')).toEqual('good');
            expect(child2.resolve('key1')).toEqual('bad');
        });

        it('ios: onConstructHook', () => {
            const decorated = createIoCLocator([new OnConstructHook(hooksMetadataCollector)]);

            const group = decorated.resolve(OnConstructImpl);

            expect(group.isConstructed).toBeTruthy();
        });

        it('ios: onDisposeHook', () => {
            const decorated = createIoCLocator([new OnDisposeHook(hooksMetadataCollector)]);

            const group = decorated.resolve(OnDisposeImpl);

            expect(group.isDisposed).toBeFalsy();
            decorated.remove();
            expect(group.isDisposed).toBeTruthy();
        });

        it('passes params to constructor(instance) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register('logger', Provider.fromConstructor(Logger));
            const app = decorated.resolve(App);

            expect(app.run()).toBe('super');
        });

        it('passes params to constructor(autofactory) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register('logger2', Provider.fromConstructor(Logger2));
            const app = decorated.resolve(App2);

            expect(app.run()).toBe('superduper');
        });

        it('passes arguments on registering', () => {
            const decorated = createIoCLocator();

            decorated.register('logger3', Provider.fromConstructor(Logger3).withArgs('super'));
            const app = decorated.resolve(App3);

            expect(app.run()).toBe('superduper');
        });

        it('passes locator as last dep', () => {
            const decorated = createIoCLocator([], { simpleInjectionCompatible: true });

            decorated.register('dep1', Provider.fromInstance('dep1'));
            decorated.register('dep2', Provider.fromInstance('dep2'));
            const app = decorated.resolve(App4);

            expect(app.run()).toBe('dep1dep2');
        });
    });
});