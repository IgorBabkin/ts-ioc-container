import 'reflect-metadata';
import {
    CachedResolvableHook,
    ContainerBuilder,
    emptyHook,
    HookedInjector,
    IDisposable,
    IResolvableHook,
    IServiceLocator,
    ProviderBuilder,
    SimpleInjector,
} from '../../lib';
import { fromFn, fromInstance } from './decorators';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hook: IResolvableHook = emptyHook) =>
        new ContainerBuilder(new SimpleInjector()).mapInjector((l) => new HookedInjector(l, hook)).build();

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(ProviderBuilder.fromClass(TestClass).forKeys('key1').build());
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should invokes postConstruct', () => {
        let isPostConstructed = false;
        const locator = createSimpleLocator({
            onResolve: (instance) => (instance as any).postConstruct(),
            onDispose() {},
        });
        const disposable = {
            postConstruct: () => {
                isPostConstructed = true;
            },
        };

        const child = locator.createScope().register(
            ProviderBuilder.fromValue(disposable)
                .withHook(
                    new CachedResolvableHook({
                        onConstruct<GInstance>(instance: GInstance) {
                            (instance as any).postConstruct();
                        },
                        onDispose<GInstance>(instance: GInstance) {},
                    }),
                )
                .forKeys('key1')
                .build(),
        );

        child.resolve('key1');

        expect(isPostConstructed).toBeTruthy();
    });

    it('should invokes onDispose', () => {
        let isDisposed = false;
        const locator = createSimpleLocator(
            new CachedResolvableHook({
                onConstruct() {},
                onDispose(instance) {
                    (instance as any as IDisposable).dispose();
                },
            }),
        );
        const disposable = {
            dispose: () => {
                isDisposed = true;
            },
        };

        const child = locator.createScope().register(
            ProviderBuilder.fromValue(disposable)
                .withHook(
                    new CachedResolvableHook({
                        onConstruct<GInstance>(instance: GInstance) {},
                        onDispose<GInstance>(instance: GInstance) {
                            (instance as any).dispose();
                        },
                    }),
                )
                .forKeys('key1')
                .build(),
        );

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

        const child1 = locator.createScope().register(fromInstance('a').forKeys('context').build());
        const child2 = locator.createScope().register(fromInstance('b').forKeys('context').build());

        expect(child1.resolve('key1')).toEqual('good');
        expect(child2.resolve('key1')).toEqual('bad');
    });
});
