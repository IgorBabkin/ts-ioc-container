import { ArgsFn, IProviderOptions, IProvider, ProviderFn, Resolving } from './IProvider';
import { constructor } from './types';

export class Provider<T> implements IProvider<T> {
    private resolving?: Resolving;
    private argsFn?: ArgsFn;

    static fromConstructor<GReturn>(
        value: constructor<GReturn>,
        options?: Partial<IProviderOptions>,
    ): Provider<GReturn> {
        return new Provider((l, ...deps: any[]) => l.resolve(value, ...deps), options);
    }

    static fromInstance<GReturn>(value: GReturn): Provider<GReturn> {
        return new Provider(() => value);
    }

    constructor(public fn: ProviderFn<T>, options: Partial<IProviderOptions> = {}) {
        this.resolving = options.resolving;
        this.argsFn = options.argsFn;
    }

    get options(): IProviderOptions {
        return {
            argsFn: this.argsFn || (() => []),
            resolving: this.resolving || 'perRequest',
        };
    }

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

    clone(options: Partial<IProviderOptions> = {}): IProvider<T> {
        return new Provider(this.fn, {
            argsFn: this.argsFn,
            resolving: this.resolving,
            ...options,
        });
    }
}
