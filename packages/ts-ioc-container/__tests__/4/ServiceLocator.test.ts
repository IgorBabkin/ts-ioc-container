import 'reflect-metadata';
import { Container, ProviderBuilder, ProviderNotFoundError } from '../../lib';
import { App, App2, App3, App4, Logger, Logger2, Logger3, OnConstructImpl } from './OnConstructImpl';
import { Group } from './Group';
import { OnDisposeImpl } from './OnDisposeImpl';
import { onConstruct, onConstructMetadataCollector, onDisposeMetadataCollector } from './decorators';
import { inject, IocInjector } from '../ioc/IocInjector';
import { SubGroup3 } from './SubGroup3';
import { InjectorHook } from '../ioc/InjectorHook';

const MyKey = Symbol('MyKey');

class Greeting {
    constructor(@inject((l) => l.resolve(MyKey)) private hey: string) {}

    say(): string {
        return `Hello ${this.hey}`;
    }
}

describe('ServiceLocator', () => {
    const createIoCLocator = (injectorHook?: InjectorHook) =>
        new Container(new IocInjector(injectorHook), { tags: ['root'] });

    it('should create an instanse', () => {
        const locator = createIoCLocator().register(
            ProviderBuilder.fromFn(() => ({}))
                .forKey('key1')
                .build(),
        );

        expect(locator.resolve('key1')).not.toBe(locator.resolve('key1'));
    });

    it('should create a singleton', () => {
        const locator = createIoCLocator().register(
            ProviderBuilder.fromFn(() => ({}))
                .forTags('root')
                .asSingleton()
                .forKey('key1')
                .build(),
        );

        expect(locator.resolve('key1')).toBe(locator.resolve('key1'));
    });

    describe('scope', () => {
        it('should override parent', () => {
            const expectedInstance1 = { id: 1 };
            const expectedInstance2 = { id: 2 };

            const locator = createIoCLocator().register(
                ProviderBuilder.fromValue(expectedInstance1).forKey('key1').build(),
            );

            const child = locator
                .createScope()
                .register(ProviderBuilder.fromValue(expectedInstance2).forKey('key1').build());

            expect(locator.resolve('key1')).toBe(expectedInstance1);
            expect(child.resolve('key1')).toBe(expectedInstance2);
        });

        it('is available to get parent deps from child', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator().register(
                ProviderBuilder.fromValue(expectedInstance1).forKey('key1').build(),
            );

            const child = locator.createScope();

            expect(child.resolve('key1')).toBe(expectedInstance1);
        });

        it('is not available to get child deps from parent', () => {
            const expectedInstance1 = {};

            const locator = createIoCLocator();

            locator.createScope().register(ProviderBuilder.fromValue(expectedInstance1).forKey('key1').build());

            expect(() => locator.resolve('key1')).toThrow(ProviderNotFoundError);
        });

        it('returns the same singleton for child and parent', () => {
            const locator = createIoCLocator().register(
                ProviderBuilder.fromFn(() => ({}))
                    .forTags('root')
                    .asSingleton()
                    .forKey('key1')
                    .build(),
            );

            const child = locator.createScope();

            expect(child.resolve('key1')).toBe(locator.resolve('key1'));
        });

        it('clears container', () => {
            const locator = createIoCLocator().register(ProviderBuilder.fromValue({}).forKey('key1').build());

            const child = locator.createScope();

            expect(child.resolve('key1')).toBeDefined();

            child.dispose();

            expect(() => child.resolve('key1')).toThrow();
        });

        it('should remove sub-sub-child', () => {
            const expectedInstance = { opa: '11' };

            const locator = createIoCLocator()
                .register(
                    ProviderBuilder.fromFn(() => expectedInstance)
                        .forTags('child')
                        .asSingleton()
                        .forKey('key1')
                        .build(),
                )
                .register(
                    ProviderBuilder.fromFn(() => ({}))
                        .forTags('child')
                        .asSingleton()
                        .forKey('key2')
                        .build(),
                );

            const child1 = locator.createScope(['child']);
            const child2 = child1.createScope();

            expect(child2.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key2')).not.toBe(child1.resolve('key1'));

            expect(() => locator.resolve('key1')).toThrow();

            child2.dispose();
            expect(() => {
                child2.resolve('key1');
            }).toThrow();
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(() => locator.resolve('key1')).toThrow();
            child1.dispose();

            expect(() => child1.resolve('key1')).toThrow();
            expect(() => locator.resolve('key1')).toThrow();
        });

        it('ioc1', () => {
            const expected = ['KEY1_VALUE', 'p2', 'p3', 'KEY2_VALUE', '1', '2', 'KEY1_VALUE', 'KEY2_VALUE'];

            const decorated = createIoCLocator()
                .register(ProviderBuilder.fromValue('KEY1_VALUE').forKey('key1').build())
                .register(ProviderBuilder.fromValue('KEY2_VALUE').forKey('key2').build())
                .register(ProviderBuilder.fromClass(SubGroup3).forKey('key3').build());

            const group = decorated.resolve(Group, 'p2', 'p3');
            const result = group.privet();

            expect(result).toEqual(expected);
        });

        it('ioc2', () => {
            const expected = {};

            const locator = createIoCLocator().register(
                ProviderBuilder.fromFn(() => expected)
                    .forKey('key1')
                    .build(),
            );

            const child1 = locator.createScope();

            expect(child1.resolve('key1')).toEqual(locator.resolve('key1'));

            child1.dispose();

            const child2 = locator.createScope();
            expect(child2.resolve('key1')).toEqual(locator.resolve('key1'));

            child2.dispose();
        });

        it('ios: onConstructHook for injector', () => {
            const decorated = createIoCLocator({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                    return instance;
                },
            });

            const group = decorated.resolve(OnConstructImpl);

            expect(group.isConstructed).toBeTruthy();
        });

        it('ioc: onConstructHook for provider', () => {
            class Initializable {
                isInitialized = false;

                @onConstruct
                init(): void {
                    this.isInitialized = true;
                }
            }

            const locator = createIoCLocator({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                    return instance;
                },
            }).register(ProviderBuilder.fromClass(Initializable).forKey('key').build());

            const group = locator.resolve<Initializable>('key');

            expect(group.isInitialized).toBeTruthy();
        });

        it('ioc: onDisposeHook', () => {
            const decorated = createIoCLocator({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                    return instance;
                },
            });

            const group = decorated.resolve(OnDisposeImpl);

            expect(group.isDisposed).toBeFalsy();
            decorated.getInstances().forEach((i) => {
                onDisposeMetadataCollector.invokeHooksOf(i as any);
            });
            decorated.dispose();
            expect(group.isDisposed).toBeTruthy();
        });

        it('passes params to constructor(instance) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register(ProviderBuilder.fromClass(Logger).forKey('logger').build());
            const app = decorated.resolve(App);

            expect(app.run()).toBe('super');
        });

        it('passes params to constructor(autofactory) in decorator', () => {
            const decorated = createIoCLocator();

            decorated.register(ProviderBuilder.fromClass(Logger2).forKey('logger2').build());
            const app = decorated.resolve(App2);

            expect(app.run()).toBe('superduper');
        });

        it('passes arguments on registering', () => {
            const decorated = createIoCLocator();

            decorated.register(
                ProviderBuilder.fromFn((l, ...args) => l.resolve(Logger3, 'super', ...args))
                    .forKey('logger3')
                    .build(),
            );
            const app = decorated.resolve(App3);

            expect(app.run()).toBe('superduper');
        });

        it('passes locator as last dep', () => {
            const decorated = createIoCLocator();

            decorated
                .register(ProviderBuilder.fromValue('dep1').forKey('dep1').build())
                .register(ProviderBuilder.fromValue('dep2').forKey('dep2').build());
            const app = decorated.resolve(App4);

            expect(app.run()).toBe('dep1dep2');
        });

        it('passes locator as last deaSp', () => {
            const decorated = createIoCLocator();

            decorated.register(ProviderBuilder.fromValue('world').forKey(MyKey).build());
            const app = decorated.resolve(Greeting);

            expect(app.say()).toBe('Hello world');
        });
    });
});
