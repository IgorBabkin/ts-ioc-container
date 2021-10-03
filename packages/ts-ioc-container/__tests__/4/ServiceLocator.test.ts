import 'reflect-metadata';
import { emptyHook, IInstanceHook, IocLocatorBuilder, ProviderNotFoundError } from '../../lib';
import { App, App2, App3, App4, Logger, Logger2, Logger3, OnConstructImpl } from './OnConstructImpl';
import { Group } from './Group';
import { OnDisposeImpl } from './OnDisposeImpl';
import {
    fromConstructor,
    fromFn,
    fromInstance,
    injectMetadataCollector,
    onConstructMetadataCollector,
    onDisposeMetadataCollector,
} from './decorators';
import { SubGroup3 } from './SubGroup3';

describe('ServiceLocator', () => {
    const createIoCLocator = (hook: IInstanceHook = emptyHook) => {
        return new IocLocatorBuilder(injectMetadataCollector).withInjectorHook(hook).build();
    };

    it('should create an instanse', () => {
        const locator = createIoCLocator().register('key1', fromFn(() => ({})).build());

        expect(locator.resolve('key1')).not.toBe(locator.resolve('key1'));
    });

    it('should create a singleton', () => {
        const locator = createIoCLocator().register(
            'key1',
            fromFn(() => ({}))
                .asSingleton()
                .build(),
        );

        expect(locator.resolve('key1')).toBe(locator.resolve('key1'));
    });

    describe('scope', () => {
        it('should override parent', () => {
            const expectedInstance1 = { id: 1 };
            const expectedInstance2 = { id: 2 };

            const locator = createIoCLocator().register('key1', fromInstance(expectedInstance1).build());

            const child = locator.createLocator().register('key1', fromInstance(expectedInstance2).build());

            expect(locator.resolve('key1')).toBe(expectedInstance1);
            expect(child.resolve('key1')).toBe(expectedInstance2);
        });

        it('is available to get parent deps from child', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator().register('key1', fromInstance(expectedInstance1).build());

            const child = locator.createLocator();

            expect(child.resolve('key1')).toBe(expectedInstance1);
        });

        it('is not available to get child deps from parent', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator();

            locator.createLocator().register('key1', fromInstance(expectedInstance1).build());

            expect(() => locator.resolve('key1')).toThrow(ProviderNotFoundError);
        });

        it('returns the same singleton for child and parent', () => {
            const locator = createIoCLocator().register(
                'key1',
                fromFn(() => ({}))
                    .asSingleton()
                    .build(),
            );

            const child = locator.createLocator();

            expect(child.resolve('key1')).toBe(locator.resolve('key1'));
        });

        it('clears container', () => {
            const locator = createIoCLocator().register('key1', fromInstance({}).build());

            const child = locator.createLocator();

            expect(child.resolve('key1')).toBeDefined();

            child.dispose();

            expect(() => child.resolve('key1')).toThrow();
        });

        it('should remove sub-sub-child', () => {
            const expectedInstance = { opa: '11' };

            const locator = createIoCLocator()
                .register(
                    'key1',
                    fromFn(() => expectedInstance)
                        .asSingleton()
                        .forScopeRange(1, 1)
                        .build(),
                )
                .register(
                    'key2',
                    fromFn(() => ({}))
                        .asScoped()
                        .build(),
                );

            const child1 = locator.createLocator();
            const child2 = child1.createLocator();

            expect(child2.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key2')).not.toBe(child1.resolve('key1'));

            expect(() => locator.resolve('key1')).toThrow();

            child2.dispose();
            expect(() => child2.resolve('key1')).toThrow();
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(() => locator.resolve('key1')).toThrow();
            child1.dispose();

            expect(() => child1.resolve('key1')).toThrow();
            expect(() => locator.resolve('key1')).toThrow();
        });

        it('ioc1', () => {
            const expected = ['KEY1_VALUE', 'p2', 'p3', 'KEY2_VALUE', '1', '2', 'KEY1_VALUE', 'KEY2_VALUE'];

            const decorated = createIoCLocator()
                .register('key1', fromInstance('KEY1_VALUE').build())
                .register('key2', fromInstance('KEY2_VALUE').build())
                .register('key3', fromConstructor(SubGroup3).build());

            const group = decorated.resolve(Group, 'p2', 'p3');
            const result = group.privet();

            expect(result).toEqual(expected);
        });

        it('ioc2', () => {
            const expected = {};

            const locator = createIoCLocator().register('key1', fromFn(() => expected).build());

            const child1 = locator.createLocator();

            expect(child1.resolve('key1')).toEqual(locator.resolve('key1'));

            child1.dispose();

            const child2 = locator.createLocator();
            expect(child2.resolve('key1')).toEqual(locator.resolve('key1'));

            child2.dispose();
        });

        it('ios: onConstructHook for injector', () => {
            const decorated = createIoCLocator({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            });

            const group = decorated.resolve(OnConstructImpl);

            expect(group.isConstructed).toBeTruthy();
        });

        it('ioc: onConstructHook for provider', () => {
            const hook = {
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            };
            const locator = createIoCLocator(hook).register(
                'key',
                fromFn(() => new OnConstructImpl())
                    .withHook(hook)
                    .build(),
            );

            const group = locator.resolve<OnConstructImpl>('key');

            expect(group.isConstructed).toBeTruthy();
        });

        it('ioc: onDisposeHook', () => {
            const decorated = createIoCLocator({
                onConstruct<GInstance>(instance: GInstance) {},
                onDispose<GInstance>(instance: GInstance) {
                    onDisposeMetadataCollector.invokeHooksOf(instance);
                },
            });

            const group = decorated.resolve(OnDisposeImpl);

            expect(group.isDisposed).toBeFalsy();
            decorated.dispose();
            expect(group.isDisposed).toBeTruthy();
        });

        it('passes params to constructor(instance) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register('logger', fromConstructor(Logger).build());
            const app = decorated.resolve(App);

            expect(app.run()).toBe('super');
        });

        it('passes params to constructor(autofactory) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register('logger2', fromConstructor(Logger2).build());
            const app = decorated.resolve(App2);

            expect(app.run()).toBe('superduper');
        });

        it('passes arguments on registering', () => {
            const decorated = createIoCLocator();

            decorated.register('logger3', fromFn((l, ...args) => l.resolve(Logger3, 'super', ...args)).build());
            const app = decorated.resolve(App3);

            expect(app.run()).toBe('superduper');
        });

        it('passes locator as last dep', () => {
            const decorated = createIoCLocator();

            decorated.register('dep1', fromInstance('dep1').build());
            decorated.register('dep2', fromInstance('dep2').build());
            const app = decorated.resolve(App4);

            expect(app.run()).toBe('dep1dep2');
        });
    });
});
