import { constructor } from '../helpers/types';
import { IProvider, ResolveDependency, ScopeOptions } from './IProvider';
import { IServiceLocator } from './IServiceLocator';

export class Provider<T> implements IProvider<T> {
    static fromConstructor<T>(value: constructor<T>): Provider<T> {
        return new Provider((l, ...args) => l.resolve(value, ...args));
    }

    static fromInstance<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): IProvider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.resolveDependency(locator, ...args);
    }

    dispose(): void {}

    isValid(filters: ScopeOptions): boolean {
        return true;
    }
}
