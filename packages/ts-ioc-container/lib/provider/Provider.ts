import { ArgsFn, IProvider, IProviderOptions, ProviderFn, Resolving } from './IProvider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../IServiceLocator';

export class Provider<T> implements IProvider<T> {
    resolving: Resolving = 'perRequest';
    private argsFn: ArgsFn = () => [];

    static fromConstructor<GReturn>(value: constructor<GReturn>): Provider<GReturn> {
        return new Provider((l, ...deps: any[]) => l.resolve(value, ...deps));
    }

    static fromInstance<GReturn>(value: GReturn): Provider<GReturn> {
        return new Provider(() => value);
    }

    constructor(public fn: ProviderFn<T>) {}

    asSingleton(): this {
        this.resolving = 'singleton';
        return this;
    }

    asScoped(): this {
        this.resolving = 'perScope';
        return this;
    }

    withArgs(...deps: any[]): this {
        this.argsFn = () => deps;
        return this;
    }

    withOptions(options: Partial<IProviderOptions> = { resolving: this.resolving, argsFn: this.argsFn }): this {
        this.resolving = options.resolving;
        this.argsFn = options.argsFn;
        return this;
    }

    clone(options: Partial<IProviderOptions> = {}): IProvider<T> {
        return new Provider(this.fn).withOptions({
            argsFn: this.argsFn,
            resolving: this.resolving,
            ...options,
        });
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.fn(locator, ...this.argsFn(locator), ...args);
    }
}
