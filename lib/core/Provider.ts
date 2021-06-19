import { IProvider, IProviderOptions, ProviderFn, Resolving } from './IProvider';
import { IServiceLocator } from './IServiceLocator';
import { UnknownResolvingTypeError } from '../errors/UnknownResolvingTypeError';

export class Provider<T> implements IProvider<T> {
    private instance: T | undefined;

    constructor(public fn: ProviderFn<T>, private options: IProviderOptions) {}

    get resolving(): Resolving {
        return this.options.resolving;
    }

    clone(options: Partial<IProviderOptions> = {}): IProvider<T> {
        return new Provider(this.fn, { ...this.options, ...options });
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        switch (this.resolving) {
            case 'singleton':
                return this.resolveSingleton(locator, ...args);
            case 'perRequest':
                return this.resolveInstance(locator, ...args);
            default:
                throw new UnknownResolvingTypeError(this.resolving);
        }
    }

    dispose(): void {}

    private resolveInstance(locator: IServiceLocator, ...args: any[]) {
        return this.fn(locator, ...args);
    }

    private resolveSingleton(locator: IServiceLocator, ...args: any[]) {
        if (this.instance === undefined) {
            this.instance = this.resolveInstance(locator, ...args);
        }

        return this.instance;
    }
}
