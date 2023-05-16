import { IProvider, ResolveDependency } from './IProvider';
import { Resolvable } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getProp, setProp } from '../reflection';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setProp('provider', mappers);

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(Target: constructor<T>): IProvider<T> {
        const mappers = getProp<MapFn<IProvider<T>>[]>(Target, 'provider') ?? [];
        return new Provider((container, ...args) => container.resolve(Target, ...args)).map(...mappers);
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    map(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
        return mappers.reduce<IProvider<T>>((acc, current) => current(acc), this);
    }

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
