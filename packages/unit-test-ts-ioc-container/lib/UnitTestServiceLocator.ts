import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import {
    constructor,
    IHook,
    IHookFactory,
    IInjector,
    IInjectorFactory,
    InjectionToken,
    IServiceLocator,
    ProviderKey,
} from 'ts-ioc-container';
import { IMockAdapter } from './IMockAdapter';
import { IMockFactory } from './IMockFactory';

export class UnitTestServiceLocator<GMock> implements IUnitTestServiceLocator<GMock> {
    private mocks: Map<ProviderKey, IMockAdapter<GMock, any>> = new Map();
    private readonly injector: IInjector;
    private hook: IHook;

    constructor(
        private injectorFactory: IInjectorFactory,
        private hookFactory: IHookFactory,
        private mockFactory: IMockFactory<GMock>,
    ) {
        this.injector = injectorFactory.create(this);
        this.hook = hookFactory.create();
    }

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
        const instance = this.injector.resolve(c, ...deps);
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
