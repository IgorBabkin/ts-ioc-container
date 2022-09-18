import { Container, fromClass, fromFn, fromValue, IDisposable, IServiceLocator, ServiceLocator } from '../../lib';
import { emptyHook, IInstanceHook } from '../../lib/core/IInstanceHook';
import { InjectorHook } from '../ioc/InjectorHook';
import { SimpleInjector } from '../ioc/SimpleInjector';
import { InstanceHook } from '../../lib/features/instanceHook/InstanceHook';

class TestClass {
    constructor(l: IServiceLocator, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hook: IInstanceHook = emptyHook, injectorHook?: InjectorHook) =>
        Container.fromInjector(new SimpleInjector(injectorHook)).setHook(hook);

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(fromClass(TestClass).forKeys('key1').build());
        const testClass = locator.resolve<TestClass>('key1', 'a', 3);

        expect(testClass.dep1).toBe('a');
        expect(testClass.dep2).toBe(3);
    });

    it('should invokes postConstruct', () => {
        class Disposable {
            isInitialized = false;

            init() {
                this.isInitialized = true;
            }
        }

        const locator = createSimpleLocator(emptyHook, {
            onConstruct: <T>(instance: T) => {
                if (instance instanceof Disposable) {
                    instance.init();
                }
                return instance;
            },
        });

        const child = locator.createScope().register(fromClass(Disposable).forKeys('key1').build());

        const instance = child.resolve<Disposable>('key1');

        expect(instance.isInitialized).toBeTruthy();
    });

    it('should invokes onDispose', () => {
        let isDisposed = false;
        const locator = createSimpleLocator(
            new InstanceHook((instance: unknown) => {
                (instance as any as IDisposable).dispose();
            }),
            {
                onConstruct<T>(instance: T): T {
                    return instance;
                },
            },
        );
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
