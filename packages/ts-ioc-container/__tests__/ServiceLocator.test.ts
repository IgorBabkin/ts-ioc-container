import 'reflect-metadata';
import { IServiceLocator } from '../lib/IServiceLocator';
import { Group } from './fixtures/Group';
import { SubGroup3 } from './fixtures/SubGroup3';
import { ServiceLocatorFactory } from '../lib/ServiceLocatorFactory';
import { IInjectable } from '../lib/instanceHooks/IInjectable';
import { FakeGenerator } from './fixtures/FakeGenerator';

describe('ServiceLocator', () => {
    const locatorFactory = new ServiceLocatorFactory();
    const fakeGenerator: FakeGenerator = new FakeGenerator();

    it('should create an instance', () => {
        const expectedInstance = {};

        const locator = locatorFactory.createIoCLocator().registerInstance('key1', expectedInstance);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });

    it('should create an instanse', () => {
        const locator = locatorFactory.createIoCLocator().registerFunction('key1', () => ({}));

        expect(locator.resolve('key1')).not.toBe(locator.resolve('key1'));
    });

    it('should create a singleton', () => {
        const locator = locatorFactory
            .createIoCLocator()
            .registerFunction('key1', () => ({}), { resolving: 'singleton' });

        expect(locator.resolve('key1')).toBe(locator.resolve('key1'));
    });

    describe('scope', () => {
        it('should override parent', () => {
            const expectedInstance1 = {};
            const expectedInstance2 = {};

            const locator = locatorFactory.createIoCLocator().registerInstance('key1', expectedInstance1);

            const child = locator.createContainer().registerInstance('key1', expectedInstance2);

            expect(locator.resolve('key1')).toBe(expectedInstance1);
            expect(child.resolve('key1')).toBe(expectedInstance2);
        });

        it('is available to get parent deps from child', () => {
            const expectedInstance1 = {};

            const locator = locatorFactory.createIoCLocator().registerInstance('key1', expectedInstance1);

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(expectedInstance1);
        });

        it('is not available to get child deps from parent', () => {
            const expectedInstance1 = {};

            const locator = locatorFactory.createIoCLocator();

            const child = locator.createContainer().registerInstance('key1', expectedInstance1);

            expect(() => locator.resolve('key1')).toThrow();
        });

        it('returns the same singleton for child and parent', () => {
            const locator = locatorFactory
                .createIoCLocator()
                .registerFunction('key1', () => ({}), { resolving: 'singleton' });

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBe(locator.resolve('key1'));
        });

        it('returns the different instalnce for child and parent', () => {
            const locator = locatorFactory.createIoCLocator().registerFunction('key1', () => ({}));

            const child = locator.createContainer();

            expect(child.resolve('key1')).not.toBe(locator.resolve('key1'));
        });

        it('clears container', () => {
            const locator: IServiceLocator = locatorFactory.createIoCLocator();
            locator.registerInstance('key1', {});

            const child = locator.createContainer();

            expect(child.resolve('key1')).toBeDefined();

            child.remove();

            expect(() => child.resolve('key1')).toThrow();
        });

        it('should invokes postConstruct', () => {
            let isPostConstructed = false;
            const locator: IServiceLocator = locatorFactory.createIoCLocator();
            const disposable = {
                postConstruct: () => {
                    isPostConstructed = true;
                },
            } as IInjectable;

            const child = locator.createContainer().registerInstance('key1', disposable);

            child.resolve('key1');

            child.remove();

            expect(isPostConstructed).toBeTruthy();
        });

        it('should invokes dispose', () => {
            let isDisposed = false;
            const locator: IServiceLocator = locatorFactory.createIoCLocator();
            const disposable = {
                dispose: () => {
                    isDisposed = true;
                },
            } as IInjectable;

            const child = locator
                .createContainer()
                .registerFunction('key1', () => disposable, { resolving: 'singleton' });

            child.resolve('key1');

            child.remove();

            expect(isDisposed).toBeTruthy();
        });

        it('should remove sub-sub-child', () => {
            const expectedInstance = { opa: '11' } as IInjectable;

            const locator = locatorFactory
                .createIoCLocator()
                .registerFunction('key1', () => expectedInstance, { resolving: 'perScope' });

            const child1 = locator.createContainer();
            const child2 = child1.createContainer();

            expect(child2.resolve('key1')).toBe(expectedInstance);
            expect(child2.resolve('key1')).toBe(expectedInstance);
            expect(child1.resolve('key1')).toBe(expectedInstance);

            expect(() => locator.resolve('key1')).toThrow();

            child2.remove();
            expect(() => child2.resolve('key1')).toThrow();
            expect(child1.resolve('key1')).toBe(expectedInstance);
            expect(() => locator.resolve('key1')).toThrow();
            child1.remove();

            expect(() => child1.resolve('key1')).toThrow();
            expect(() => locator.resolve('key1')).toThrow();
        });

        it('asd', () => {
            const expected = ['KEY1_VALUE', 'p2', 'p3', 'KEY2_VALUE', '1', '2', 'KEY1_VALUE', 'KEY2_VALUE'];

            const decorated = locatorFactory
                .createIoCLocator()
                .registerInstance('key1', 'KEY1_VALUE')
                .registerInstance('key2', 'KEY2_VALUE')
                .registerConstructor('key3', SubGroup3);

            const group = decorated.resolve(Group, 'p2', 'p3');
            const result = group.privet();

            expect(result).toEqual(expected);
        });
    });
});
