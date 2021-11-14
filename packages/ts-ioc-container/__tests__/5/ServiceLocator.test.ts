import 'reflect-metadata';
import {
    emptyHook,
    HookedServiceLocator,
    IDisposable,
    IInstanceHook,
    IServiceLocator,
    ProviderBuilder,
    ServiceLocator,
    SimpleInjector,
} from '../../lib';
import { fromFn, fromInstance } from './decorators';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hooks: IInstanceHook = emptyHook) =>
        new HookedServiceLocator(ServiceLocator.root(new SimpleInjector()), hooks);

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(ProviderBuilder.fromClass(TestClass).forKeys('key1').build());
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should invokes postConstruct', () => {
        let isPostConstructed = false;
        const locator = createSimpleLocator({
            onConstruct: (instance) => (instance as any).postConstruct(),
            onDispose() {},
        });
        const disposable = {
            postConstruct: () => {
                isPostConstructed = true;
            },
        };

        const child = locator.createScope().register(
            ProviderBuilder.fromValue(disposable)
                .withHook({
                    onConstruct<GInstance>(instance: GInstance) {
                        (instance as any).postConstruct();
                    },
                    onDispose<GInstance>(instance: GInstance) {},
                })
                .forKeys('key1')
                .build(),
        );

        child.resolve('key1');

        expect(isPostConstructed).toBeTruthy();
    });

    it('should invokes onDispose', () => {
        let isDisposed = false;
        const locator = createSimpleLocator({
            onConstruct() {},
            onDispose(instance) {
                (instance as any as IDisposable).dispose();
            },
        });
        const disposable = {
            dispose: () => {
                isDisposed = true;
            },
        };

        const child = locator.createScope().register(
            ProviderBuilder.fromValue(disposable)
                .withHook({
                    onConstruct<GInstance>(instance: GInstance) {},
                    onDispose<GInstance>(instance: GInstance) {
                        (instance as any).dispose();
                    },
                })
                .forKeys('key1')
                .build(),
        );

        child.resolve('key1');

        child.dispose();

        expect(isDisposed).toBeTruthy();
    });

    it('conditional resolving', () => {
        const locator = createSimpleLocator().register(
            fromFn((l: IServiceLocator) => (l.resolve('context') === 'a' ? 'good' : 'bad'))
                .forLevel(1)
                .asSingleton()
                .forKeys('key1')
                .build(),
        );

        const child1 = locator.createScope().register(fromInstance('a').forKeys('context').build());
        const child2 = locator.createScope().register(fromInstance('b').forKeys('context').build());

        expect(child1.resolve('key1')).toEqual('good');
        expect(child2.resolve('key1')).toEqual('bad');
    });
});
