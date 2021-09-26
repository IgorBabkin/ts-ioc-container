import { IProviderRepository } from '../core/IProviderRepository';
import { ProviderRepository } from '../core/ProviderRepository';
import { IServiceLocator } from '../core/IServiceLocator';
import { IInjector } from '../core/IInjector';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { HookedInjector } from './instanceHook/HookedInjector';
import { IMockProviderStorage } from './mock/IMockProviderStorage';
import { MockedRepository } from './mock/MockedRepository';
import { ServiceLocator } from '../core/ServiceLocator';
import { ILocatorBuilder } from './ILocatorBuilder';

export abstract class LocatorBuilder implements ILocatorBuilder {
    private providerRepository: IProviderRepository = new ProviderRepository();

    protected constructor(private createInjector: (l: IServiceLocator) => IInjector) {}

    withInjectorHook(hook: IInstanceHook): this {
        const oldFn = this.createInjector;
        this.createInjector = (l) => new HookedInjector(oldFn(l), hook);
        return this;
    }

    withMockedRepository(mockedProviderStorage: IMockProviderStorage): this {
        this.providerRepository = new MockedRepository(this.providerRepository, mockedProviderStorage);
        return this;
    }

    build(): IServiceLocator {
        return new ServiceLocator(this.createInjector, this.providerRepository);
    }
}
