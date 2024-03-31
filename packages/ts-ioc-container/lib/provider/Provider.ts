import { ChildrenVisibilityPredicate, IProvider, ResolveDependency, ScopePredicate } from './IProvider';
import { Resolvable, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

const PROVIDER_KEY = 'provider';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);

export const visible =
  (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);

export function scope<T = unknown>(predicate: ScopePredicate): MapFn<IProvider<T>> {
  return (provider) => provider.setScopePredicate(predicate);
}

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, { args })).pipe(...mappers);
  }

  static fromValue<T>(value: T): Provider<T> {
    return new Provider(() => value);
  }

  constructor(
    private readonly resolveDependency: ResolveDependency<T>,
    private isVisibleWhen: ChildrenVisibilityPredicate = () => true,
    private isValidWhen: ScopePredicate = () => true,
  ) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  clone(): Provider<T> {
    return new Provider(this.resolveDependency, this.isVisibleWhen, this.isValidWhen);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.isVisibleWhen = predicate;
    return this;
  }

  setScopePredicate(isValidWhen: ScopePredicate): this {
    this.isValidWhen = isValidWhen;
    return this;
  }

  isVisible(parent: Tagged, child: Tagged): boolean {
    return this.isValidWhen(parent) && this.isVisibleWhen({ child, isParent: child === parent });
  }

  isValidToClone(container: Tagged): boolean {
    return this.isValidWhen(container);
  }
}
