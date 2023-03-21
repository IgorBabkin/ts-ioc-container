import 'reflect-metadata';
import { Disposable, IContainer, Container, ProviderBuilder } from '../../lib';
import { emptyHook, IContainerHook } from '../../lib/core/container/IContainerHook';
import { InjectorHook } from '../ioc/InjectorHook';
import { SimpleInjector } from '../ioc/SimpleInjector';
import { ContainerHook } from '../../lib';

class TestClass {
    constructor(l: IContainer, public dep1: string, public dep2: number) {}
}

describe('ServiceLocator', () => {
    const createSimpleLocator = (hook: IContainerHook = emptyHook, injectorHook?: InjectorHook) =>
        new Container(new SimpleInjector(injectorHook)).setHook(hook);

    it('should pass dependencies', () => {
        const locator = createSimpleLocator().register(ProviderBuilder.fromClass(TestClass).forKey('key1').build());
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

        const child = locator.createScope().register(ProviderBuilder.fromClass(Disposable).forKey('key1').build());

        const instance = child.resolve<Disposable>('key1');

        expect(instance.isInitialized).toBeTruthy();
    });

    it('should invokes onDispose', () => {
        let isDisposed = false;
        const locator = createSimpleLocator(
            new ContainerHook((instance: unknown) => {
                (instance as any as Disposable).dispose();
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

        const child = locator.createScope().register(ProviderBuilder.fromValue(disposable).forKey('key1').build());

        child.resolve('key1');

        child.dispose();

        expect(isDisposed).toBeTruthy();
    });

    it('conditional resolving', () => {
        const locator = createSimpleLocator().register(
            ProviderBuilder.fromFn((l) => (l.resolve('context') === 'a' ? 'good' : 'bad'))
                .forLevel(1)
                .asSingleton()
                .forKey('key1')
                .build(),
        );

        const child1 = locator.createScope().register(ProviderBuilder.fromValue('a').forKey('context').build());
        const child2 = locator.createScope().register(ProviderBuilder.fromValue('b').forKey('context').build());

        expect(child1.resolve('key1')).toEqual('good');
        expect(child2.resolve('key1')).toEqual('bad');
    });
});
