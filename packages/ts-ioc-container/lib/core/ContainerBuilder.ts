import { IInjector } from './IInjector';
import { IServiceLocator } from './IServiceLocator';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { id } from '../helpers/utils';
import { ScopeOptions } from './provider/IProvider';
import { Container } from './Container';
import { ServiceLocator } from './ServiceLocator';
import { emptyHook, IInstanceHook } from './IInstanceHook';

export type MapFn<T> = (value: T) => T;

export class ContainerBuilder {
    constructor(
        private injector: IInjector,
        private parent: IServiceLocator = new EmptyServiceLocator(),
        private mapFn: MapFn<IServiceLocator> = id,
        private options: Partial<ScopeOptions> = {},
        private hook: IInstanceHook = emptyHook,
    ) {}

    mapLocator(fn: MapFn<IServiceLocator>): this {
        const oldFn = this.mapFn;
        this.mapFn = (value) => fn(oldFn(value));
        return this;
    }

    setHook(hook: IInstanceHook): this {
        this.hook = hook;
        return this;
    }

    withOptions(options: Partial<ScopeOptions>): this {
        this.options = options;
        return this;
    }

    build(): Container {
        const parent = this.mapFn(this.parent);
        const locator = new ServiceLocator(parent, this.injector, this.options.level, this.options.tags, this.hook);
        return new Container(this.mapFn(locator));
    }
}
