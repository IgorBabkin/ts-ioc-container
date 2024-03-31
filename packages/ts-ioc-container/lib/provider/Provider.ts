import { IProvider, ResolveDependency } from './IProvider';
import { Resolvable, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

const PROVIDER_KEY = 'provider';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);
export const hideFromChildren: MapFn<IProvider> = (p) => p.hideFromChildren();

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, ...args)).pipe(...mappers);
  }

  static fromValue<T>(value: T): Provider<T> {
    return new Provider(() => value);
  }

  private isHiddenFromChildren = false;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  clone(): Provider<T> {
    return new Provider(this.resolveDependency);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  hideFromChildren(): this {
    this.isHiddenFromChildren = true;
    return this;
  }

  isValid(container: Tagged, fromChild = false): boolean {
    return !(this.isHiddenFromChildren && fromChild);
  }
}
