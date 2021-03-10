import { IProvider, IProviderOptions, ProviderFn, Resolving } from './IProvider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../IServiceLocator';

export class Provider<T> implements IProvider<T> {
    static fromConstructor<GReturn>(value: constructor<GReturn>): Provider<GReturn> {
        return new Provider((l, ...deps: any[]) => l.resolve(value, ...deps));
    }

    static fromInstance<GReturn>(value: GReturn): Provider<GReturn> {
        return new Provider(() => value);
    }

    private readonly options: IProviderOptions;

    constructor(public fn: ProviderFn<T>, options: Partial<IProviderOptions> = {}) {
        const defaultOptions: IProviderOptions = { resolving: 'perRequest', argsFn: () => [] };
        this.options = { ...defaultOptions, ...options };
    }

    get resolving(): Resolving {
        return this.options.resolving;
    }

    asSingleton(): this {
        this.options.resolving = 'singleton';
        return this;
    }

    asScoped(): this {
        this.options.resolving = 'perScope';
        return this;
    }

    withArgs(...deps: any[]): this {
        this.options.argsFn = () => deps;
        return this;
    }

    clone(options: Partial<IProviderOptions> = {}): IProvider<T> {
        return new Provider(this.fn, { ...this.options, ...options });
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.fn(locator, ...this.options.argsFn(locator), ...args);
    }
}
