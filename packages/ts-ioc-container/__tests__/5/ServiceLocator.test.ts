import 'reflect-metadata';
import {
    ContainerBuilder,
    fromClass,
    fromFn,
    fromValue,
    IDisposable,
    IServiceLocator,
    SimpleInjector,
} from '../../lib';
import { emptyHook, IInstanceHook } from '../../lib/core/IInstanceHook';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hook: IInstanceHook = emptyHook) =>
        new ContainerBuilder(new SimpleInjector()).setHook(hook).build();

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(fromClass(TestClass).forKeys('key1').build());
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should invokes postConstruct', () => {
        let isPostConstructed = false;
        const locator = createSimpleLocator({
            onConstruct: (instance) => {
                (instance as any).postConstruct();
                return instance;
            },
            onResolve<T>(instance: T): T {
                return instance;
            },
            onDispose() {},
        });
        const disposable = {
            postConstruct: () => {
                isPostConstructed = true;
            },
        };

        const child = locator.createScope().register(fromValue(disposable).forKeys('key1').build());

        child.resolve('key1');

        expect(isPostConstructed).toBeTruthy();
    });

    it('should invokes onDispose', () => {
        let isDisposed = false;
        const locator = createSimpleLocator({
            onConstruct<T>(instance: T): T {
                return instance;
            },
            onResolve<T>(instance: T): T {
                return instance;
            },
            onDispose(instance) {
                (instance as any as IDisposable).dispose();
            },
        });
        const disposable = {
            dispose: () => {
                isDisposed = true;
            },
        };

        const child = locator.createScope().register(fromValue(disposable).forKeys('key1').build());

        child.resolve('key1');

        child.dispose();

        expect(isDisposed).toBeTruthy();
    });

    it('conditional resolving', () => {
        const locator = createSimpleLocator().register(
            fromFn((l) => (l.resolve('context') === 'a' ? 'good' : 'bad'))
                .forLevel(1)
                .asSingleton()
                .forKeys('key1')
                .build(),
        );

        const child1 = locator.createScope().register(fromValue('a').forKeys('context').build());
        const child2 = locator.createScope().register(fromValue('b').forKeys('context').build());

        expect(child1.resolve('key1')).toEqual('good');
        expect(child2.resolve('key1')).toEqual('bad');
    });
});
