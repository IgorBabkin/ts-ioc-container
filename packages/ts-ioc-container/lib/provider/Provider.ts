import { ChildrenVisibilityPredicate, IProvider, PROVIDER_KEY, ResolveDependency, ScopePredicate } from './IProvider';
import { IContainer, Tagged } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { getMetadata } from '../metadata';

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, { args })).pipe(...mappers);
  }

  static fromValue<T>(value: T): IProvider<T> {
    const mappers = isConstructor(value) ? getMetadata<MapFn<IProvider<T>>[]>(value, PROVIDER_KEY) ?? [] : [];
    return new Provider(() => value).pipe(...mappers);
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

  resolve(container: IContainer, ...args: unknown[]): T {
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
