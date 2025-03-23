import {
  ArgsFn,
  ChildrenVisibilityPredicate,
  IProvider,
  ProviderMapper,
  ProviderResolveOptions,
  ResolveDependency,
} from './IProvider';
import { DependencyKey, IContainer, Tagged } from '../container/IContainer';
import { constructor, lazyProxy, MapFn, pipe } from '../utils';

export class Provider<T = any> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    return new Provider((container, options) => container.resolveByClass(Target, options));
  }

  static fromValue<T>(value: T): IProvider<T> {
    return new Provider(() => value);
  }

  static fromKey<T>(key: DependencyKey) {
    return new Provider<T>((c) => c.resolve(key));
  }

  private argsFn: ArgsFn = () => [];
  private isVisibleWhen: ChildrenVisibilityPredicate = () => true;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: Array<MapFn<IProvider<T>> | ProviderMapper>): IProvider<T> {
    return pipe(...mappers.map((m) => (m instanceof ProviderMapper ? m.mapItem.bind(m) : m)))(this);
  }

  resolve(container: IContainer, { args, lazy: isLazy }: ProviderResolveOptions): T {
    const resolveDependency = () =>
      this.resolveDependency(container, { args: [...this.argsFn(container, ...args), ...args] });
    return isLazy ? lazyProxy(resolveDependency) : resolveDependency();
  }

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.isVisibleWhen = predicate;
    return this;
  }

  setArgs(argsFn: ArgsFn): this {
    this.argsFn = argsFn;
    return this;
  }

  isVisible(parent: Tagged, child: Tagged): boolean {
    return this.isVisibleWhen({ child, isParent: child === parent });
  }
}
