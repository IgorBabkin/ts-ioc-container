import { IProvider, ResolveDependency } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';

export class Provider<T> implements IProvider<T> {
    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): IProvider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.resolveDependency(locator, ...args);
    }

    dispose(): void {}
}
