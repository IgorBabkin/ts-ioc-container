import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import {
    constructor,
    IInstanceHook,
    InjectionToken,
    IServiceLocator,
    IServiceLocatorStrategy,
    IStrategyFactory,
    ProviderKey,
} from 'ts-ioc-container';
import { IMockAdapter } from './IMockAdapter';
import { IMockFactory } from './IMockFactory';

export class UnitTestServiceLocator<GMock> implements IUnitTestServiceLocator<GMock> {
    private strategy: IServiceLocatorStrategy;
    private mocks: Map<string | symbol, IMockAdapter<GMock, any>> = new Map();

    constructor(
        private strategyFactory: IStrategyFactory,
        private hooks: IInstanceHook[],
        private mockFactory: IMockFactory<GMock>,
    ) {
        this.strategy = strategyFactory.create(this);
    }

    public resolveMock(key: ProviderKey): GMock {
        return this.findMock(key).getMock();
    }

    public resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        if (typeof key === 'string' || typeof key === 'symbol') {
            const mock = this.findMock(key);
            return mock.getInstance();
        }
        return this.resolveConstructor(key, ...deps);
    }

    public createContainer(): IServiceLocator {
        throw new Error('Not implemented');
    }

    public remove(): void {
        this.mocks = new Map();
    }

    public register(...args: any[]): this {
        throw new Error('Not implemented');
    }

    private resolveConstructor<T>(c: constructor<T>, ...deps: any[]): T {
        const instance = this.strategy.resolveConstructor(c, ...deps);
        for (const hook of this.hooks) {
            hook.onCreateInstance(instance);
        }
        return instance;
    }

    private findMock(key: string | symbol): IMockAdapter<GMock, any> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.mockFactory.create());
        }
        return this.mocks.get(key);
    }
}
