import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import { constructor, IHook, InjectionToken, IServiceLocator, IInjector, ProviderKey } from 'ts-ioc-container';
import { IMockAdapter } from './IMockAdapter';
import { IMockFactory } from './IMockFactory';

export class UnitTestServiceLocator<GMock> implements IUnitTestServiceLocator<GMock> {
    private mocks: Map<ProviderKey, IMockAdapter<GMock, any>> = new Map();

    constructor(private strategy: IInjector, private hook: IHook, private mockFactory: IMockFactory<GMock>) {}

    resolveMock(key: ProviderKey): GMock {
        return this.findMock(key).getMock();
    }

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        if (typeof key === 'string' || typeof key === 'symbol') {
            const mock = this.findMock(key);
            return mock.getInstance();
        }
        return this.resolveConstructor(key, ...deps);
    }

    createContainer(): IServiceLocator {
        throw new Error('Not implemented');
    }

    remove(): void {
        this.mocks = new Map();
        this.hook.onContainerRemove();
        this.hook.dispose();
    }

    register(): this {
        throw new Error('Not implemented');
    }

    private resolveConstructor<T>(c: constructor<T>, ...deps: any[]): T {
        const instance = this.strategy.resolveConstructor(this, c, ...deps);
        this.hook.onInstanceCreate(instance);
        return instance;
    }

    private findMock(key: ProviderKey): IMockAdapter<GMock, any> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.mockFactory.create());
        }
        return this.mocks.get(key);
    }
}
