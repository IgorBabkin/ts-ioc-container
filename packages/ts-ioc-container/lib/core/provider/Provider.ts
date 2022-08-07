import { constructor } from '../../helpers/types';
import { IProvider, ResolveDependency } from './IProvider';
import { Resolveable } from '../IServiceLocator';

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(value: constructor<T>): Provider<T> {
        return new Provider((l, ...args) => l.resolve(value, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): Provider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.resolveDependency(locator, ...args);
    }

    dispose(): void {}

    isValid(): boolean {
        return true;
    }
}
