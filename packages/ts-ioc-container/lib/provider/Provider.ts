import { ChildrenVisibilityPredicate, IProvider, ResolveDependency } from './IProvider';
import { IContainer, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    return new Provider((container, ...args) => container.resolve(Target, { args }));
  }

  static fromValue<T>(value: T): IProvider<T> {
    return new Provider(() => value);
  }

  constructor(
    private readonly resolveDependency: ResolveDependency<T>,
    private isVisibleWhen: ChildrenVisibilityPredicate = () => true,
  ) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.isVisibleWhen = predicate;
    return this;
  }

  isVisible(parent: Tagged, child: Tagged): boolean {
    return this.isVisibleWhen({ child, isParent: child === parent });
  }
}
