import { IProvider, ProviderFn } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';

export class Provider<T> implements IProvider<T> {
    constructor(private readonly fn: ProviderFn<T>) {}

    clone(): IProvider<T> {
        return new Provider(this.fn);
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.fn(locator, ...args);
    }

    dispose(): void {}
}
