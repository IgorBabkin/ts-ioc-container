import { IProvider, ResolveDependency } from './IProvider';
import { Resolvable } from '../container/IContainer';

export class Provider<T> implements IProvider<T> {
    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): Provider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(container: Resolvable, ...args: unknown[]): T {
        return this.resolveDependency(container, ...args);
    }

    dispose(): void {}

    isValid(): boolean {
        return true;
    }
}
