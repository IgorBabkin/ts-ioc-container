import 'reflect-metadata';
import {
    IDisposable,
    IInstanceHook,
    InstanceHookInjector,
    IServiceLocator,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
} from '../../lib';
import { fromFn, fromInstance } from './decorators';
import { ProviderBuilder } from '../../lib/features/ProviderBuilder';
import { emptyHook } from '../emptyHook';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hooks: IInstanceHook = emptyHook) =>
        new ServiceLocator(() => new InstanceHookInjector(new SimpleInjector(), hooks), new ProviderRepository());

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(
            'key1',
            ProviderBuilder.fromConstructor(TestClass).asRequested(),
        );
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

        const child = locator.createLocator().register(
            'key1',
            ProviderBuilder.fromInstance(disposable)
                .withHook({
                    onConstruct<GInstance>(instance: GInstance) {
                        (instance as any).postConstruct();
                    },
                    onDispose<GInstance>(instance: GInstance) {},
                })
                .asRequested(),
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

        const child = locator.createLocator().register(
            'key1',
            ProviderBuilder.fromInstance(disposable)
                .withHook({
                    onConstruct<GInstance>(instance: GInstance) {},
                    onDispose<GInstance>(instance: GInstance) {
                        (instance as any).dispose();
                    },
                })
                .asRequested(),
        );

        child.resolve('key1');

        child.remove();

        expect(isDisposed).toBeTruthy();
    });

    it('conditional resolving', () => {
        const locator = createSimpleLocator().register(
            'key1',
            fromFn((l: IServiceLocator) => (l.resolve('context') === 'a' ? 'good' : 'bad')).asScoped(),
        );

        const child1 = locator.createLocator().register('context', fromInstance('a').asRequested());
        const child2 = locator.createLocator().register('context', fromInstance('b').asRequested());

        expect(child1.resolve('key1')).toEqual('good');
        expect(child2.resolve('key1')).toEqual('bad');
    });
});
