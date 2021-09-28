import { IProvider, ResolveDependency } from '../core/providers/IProvider';
import { SingletonProvider } from '../core/providers/SingletonProvider';
import { ScopedProvider } from '../core/providers/ScopedProvider';
import { Provider } from '../core/providers/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../core/IServiceLocator';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';

export class ProviderBuilder<T> {
    private provider: IProvider<T>;

    static fromConstructor<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder((l, ...args) => l.resolve(value, ...args));
    }

    static fromInstance<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(() => value);
    }

    constructor(fn: ResolveDependency<T>) {
        this.provider = new Provider(fn);
    }

    withArgs(...extraArgs: any[]): this {
        this.withArgsFn(() => extraArgs);
        return this;
    }

    withHook(hook: IInstanceHook): this {
        this.provider = new HookedProvider(this.provider, hook);
        return this;
    }

    withArgsFn(fn: (l: IServiceLocator) => any[]): this {
        const oldProvider = this.provider;
        this.provider = new Provider((l, ...args) => oldProvider.resolve(l, ...args, ...fn(l)));
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
