import { IInjector } from './IInjector';
import { IServiceLocator } from './IServiceLocator';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { id } from '../helpers/utils';
import { ScopeOptions } from './provider/IProvider';
import { DIContainer } from './DIContainer';
import { MapFn, ServiceLocator } from './ServiceLocator';
import { IDIProviderBuilder } from './IDIContainer';
import { DIProviderBuilder } from './DIProviderBuilder';
import { IResolvableHook } from '../features/instanceHook/IResolvableHook';
import { HookedProviderBuilder } from './HookedProviderBuilder';
import { HookedInjector } from '../features/instanceHook/HookedInjector';

export class ContainerBuilder {
    constructor(
        private injector: IInjector,
        private parent: IServiceLocator = new EmptyServiceLocator(),
        private providerBuilder: IDIProviderBuilder = new DIProviderBuilder(),
        private mapFn: MapFn<IServiceLocator> = id,
        private options: Partial<ScopeOptions> = {},
    ) {}

    mapLocator(fn: MapFn<IServiceLocator>): this {
        const oldFn = this.mapFn;
        this.mapFn = (value) => fn(oldFn(value));
        return this;
    }

    withHook(hook: IResolvableHook): this {
        this.injector = new HookedInjector(this.injector, hook);
        this.providerBuilder = new HookedProviderBuilder(this.providerBuilder, hook);
        return this;
    }

    mapInjector(fn: MapFn<IInjector>): this {
        this.injector = fn(this.injector);
        return this;
    }

    withOptions(options: Partial<ScopeOptions>): this {
        this.options = options;
        return this;
    }

    build(): DIContainer {
        const parent = this.mapFn(this.parent);
        const locator = new ServiceLocator(parent, this.injector, this.options.level, this.options.tags);
        return new DIContainer(this.mapFn(locator), this.providerBuilder);
    }
}
