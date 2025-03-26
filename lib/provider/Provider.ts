import type {
  ArgsFn,
  ChildrenVisibilityPredicate,
  IProvider,
  ProviderResolveOptions,
  ResolveDependency,
} from './IProvider';
import type { DependencyKey, IContainer, Tagged } from '../container/IContainer';
import type { constructor, MapFn } from '../utils';
import { lazyProxy, pipe } from '../utils';
import type { ProviderPipe } from './ProviderPipe';
import { isProviderPipe } from './ProviderPipe';

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

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T> {
    const fns = mappers.map((m): MapFn<IProvider<T>> => (isProviderPipe<T>(m) ? m.mapProvider.bind(m) : m));
    return pipe(...fns)(this);
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
