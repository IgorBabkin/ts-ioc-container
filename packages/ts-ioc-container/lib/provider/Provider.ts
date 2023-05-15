import { IProvider, ResolveDependency } from './IProvider';
import { Resolvable } from '../container/IContainer';
import { constructor } from '../utils';

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(Target: constructor<T>): Provider<T> {
        return new Provider((container, ...args) => container.resolve(Target, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): Provider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(container: Resolvable, ...args: unknown[]): T {
        return this.resolveDependency(container, ...args);
    }

    isValid(): boolean {
        return true;
    }
}
