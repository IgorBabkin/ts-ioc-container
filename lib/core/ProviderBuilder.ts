import { IProvider, ProviderFn } from './providers/IProvider';
import { SingletonProvider } from './providers/SingletonProvider';
import { ScopedProvider } from './providers/ScopedProvider';
import { Provider } from './providers/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from './IServiceLocator';
import { InstanceHookProvider } from '../features/instanceHook/InstanceHookProvider';
import { IInstanceHook } from '../features/instanceHook/IInstanceHook';

export class ProviderBuilder<T> {
    private provider: IProvider<T>;

    static fromConstructor<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder((l, ...args) => l.resolve(value, ...args));
    }

    static fromInstance<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(() => value);
    }

    constructor(fn: ProviderFn<T>) {
        this.provider = new Provider(fn);
    }

    withArgs(...extraArgs: any[]): this {
        this.withArgsFn(() => extraArgs);
        return this;
    }

    withHook(hook: IInstanceHook): this {
        this.provider = new InstanceHookProvider(this.provider, hook);
        return this;
    }

    withArgsFn(fn: (l: IServiceLocator) => any[]): this {
        this.provider = new Provider((l, ...args) => this.provider.resolve(l, ...args, ...fn(l)));
        return this;
    }

    asSingleton(): SingletonProvider<T> {
        return new SingletonProvider(this.provider);
    }

    asScoped(): ScopedProvider<T> {
        return new ScopedProvider(this.provider);
    }

    asRequested(): IProvider<T> {
        return this.provider;
    }
}
