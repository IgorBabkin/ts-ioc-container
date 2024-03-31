import { ChildrenPredicate, IProvider, ResolveDependency } from './IProvider';
import { Resolvable, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

const PROVIDER_KEY = 'provider';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);
export const hideFromChildren =
  (isHiddenForChildren: ChildrenPredicate): MapFn<IProvider> =>
  (p) =>
    p.hideFromChildren(isHiddenForChildren);

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, ...args)).pipe(...mappers);
  }

  static fromValue<T>(value: T): Provider<T> {
    return new Provider(() => value);
  }

  constructor(
    private readonly resolveDependency: ResolveDependency<T>,
    private isHiddenForChildren: ChildrenPredicate = () => false,
  ) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  clone(): Provider<T> {
    return new Provider(this.resolveDependency, this.isHiddenForChildren);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  hideFromChildren(isHiddenForChildren: ChildrenPredicate): this {
    this.isHiddenForChildren = isHiddenForChildren;
    return this;
  }

  isValidToResolve(container: Tagged, child?: Tagged): boolean {
    return child === undefined || !this.isHiddenForChildren(child);
  }

  isValidToClone(): boolean {
    return true;
  }
}
