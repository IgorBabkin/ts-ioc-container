import 'reflect-metadata';
import { hooksMetadataCollector } from '../lib/instanceHooks/ioc/decorators';
import { metadataCollector } from '../lib/strategy/ioc/decorators';
import { IServiceLocator } from '../lib/IServiceLocator';
import {
    IInstanceHook,
    IocServiceLocatorStrategyFactory,
    OnConstructHook,
    ServiceLocator,
    SimpleServiceLocatorStrategyFactory,
} from '../lib';
import { App, App2, Logger, Logger2, OnConstructImpl } from './fixtures/OnConstructImpl';
import { SubGroup3 } from './fixtures/SubGroup3';
import { Group } from './fixtures/Group';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hooks: IInstanceHook[] = []) =>
        new ServiceLocator(new SimpleServiceLocatorStrategyFactory(), hooks);
    const createIoCLocator = (hooks: IInstanceHook[] = []) =>
        new ServiceLocator(new IocServiceLocatorStrategyFactory(metadataCollector), hooks);

    it('should create an instance', () => {
        const expectedInstance = {};

        const locator = createIoCLocator().registerInstance('key1', expectedInstance);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().registerConstructor('key1', TestClass);
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should create an instanse', () => {
        const locator = createIoCLocator().registerFunction('key1', () => ({}));

        expect(locator.resolve('key1')).not.toBe(locator.resolve('key1'));
    });

    it('should create a singleton', () => {
        const locator = createIoCLocator().registerFunction('key1', () => ({}), { resolving: 'singleton' });

        expect(locator.resolve('key1')).toBe(locator.resolve('key1'));
    });

    describe('scope', () => {
        it('should override parent', () => {
            const expectedInstance1 = {};
            const expectedInstance2 = {};

            const locator = createIoCLocator().registerInstance('key1', expectedInstance1);

            const child = locator.createContainer().registerInstance('key1', expectedInstance2);

            expect(locator.resolve('key1')).toBe(expectedInstance1);
            expect(child.resolve('key1')).toBe(expectedInstance2);
        });

        it('is available to get parent deps from child', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator().registerInstance('key1', expectedInstance1);

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(expectedInstance1);
        });

        it('is not available to get child deps from parent', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator();

            const child = locator.createContainer().registerInstance('key1', expectedInstance1);

            expect(() => locator.resolve('key1')).toThrow();
        });

        it('returns the same singleton for child and parent', () => {
            const locator = createIoCLocator().registerFunction('key1', () => ({}), { resolving: 'singleton' });

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(locator.resolve('key1'));
        });

        it('clears container', () => {
            const locator = createIoCLocator().registerInstance('key1', {});

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBeDefined();

            child.remove();

            expect(() => child.resolve('key1')).toThrow();
        });

        it('should invokes postConstruct', () => {
            let isPostConstructed = false;
            const locator = createSimpleLocator([
                {
                    onCreateInstance: (instance) => instance.postConstruct(),
                },
            ]);
            const disposable = {
                postConstruct: () => {
                    isPostConstructed = true;
                },
            };

            const child = locator.createContainer().registerInstance('key1', disposable);

            child.resolve('key1');

            child.remove();

            expect(isPostConstructed).toBeTruthy();
        });

        it('should remove sub-sub-child', () => {
            const expectedInstance = { opa: '11' };

            const locator = createIoCLocator()
                .registerFunction('key1', () => expectedInstance, { resolving: 'perScope' })
                .registerFunction('key2', () => ({}), { resolving: 'perScope' });

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
                .registerInstance('key1', 'KEY1_VALUE')
                .registerInstance('key2', 'KEY2_VALUE')
                .registerConstructor('key3', SubGroup3);

            const group = decorated.resolve(Group, 'p2', 'p3');
            const result = group.privet();

            expect(result).toEqual(expected);
        });

        it('ioc2', () => {
            const expected = {};

            const locator = createIoCLocator().registerFunction('key1', () => expected, { resolving: 'singleton' });

            const child1 = locator.createContainer();

            expect(child1.resolve('key1')).toEqual(locator.resolve('key1'));

            child1.remove();

            const child2 = locator.createContainer();
            expect(child2.resolve('key1')).toEqual(locator.resolve('key1'));

            child2.remove();
        });

        it('conditional resolving', () => {
            const locator = createSimpleLocator().registerFunction(
                'key1',
                (l: IServiceLocator<string>) => (l.context === 'a' ? 'good' : 'bad'),
                {
                    resolving: 'perScope',
                },
            );

            const child1 = locator.createContainer('a');
            const child2 = locator.createContainer('b');

            expect(child1.resolve('key1')).toEqual('good');
            expect(child2.resolve('key1')).toEqual('bad');
        });

        it('ios: onConstructHook', () => {
            const decorated = createIoCLocator([new OnConstructHook(hooksMetadataCollector)]);

            const group = decorated.resolve(OnConstructImpl);

            expect(group.isConstructed).toBeTruthy();
        });

        it('passes params to constructor(instance) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.registerConstructor('logger', Logger);
            const app = decorated.resolve(App);

            expect(app.run()).toBe('super');
        });

        it('passes params to constructor(autofactory) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.registerConstructor('logger', Logger2);
            const app = decorated.resolve(App2);

            expect(app.run()).toBe('superduper');
        });
    });
});
