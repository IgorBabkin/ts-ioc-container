import { constructor } from '../utils/types';
import { IProvider, ResolveDependency } from './IProvider';
import { Resolveable } from '../container/IContainer';

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(value: constructor<T>): Provider<T> {
        return new Provider((container, ...args) => container.resolve(value, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): Provider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(container: Resolveable, ...args: unknown[]): T {
        return this.resolveDependency(container, ...args);
    }

    dispose(): void {}

    isValid(): boolean {
        return true;
    }
}
