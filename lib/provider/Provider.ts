import {
  ArgsFn,
  ChildrenVisibilityPredicate,
  getTransformers,
  IProvider,
  ProviderResolveOptions,
  ResolveDependency,
} from './IProvider';
import { DependencyKey, IContainer, Tagged } from '../container/IContainer';
import { constructor, isConstructor, lazyProxy, MapFn, pipe } from '../utils';

export class Provider<T = any> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const transformers = getTransformers(Target);
    return new Provider((container, options) => container.resolveByClass(Target, options)).pipe(...transformers);
  }

  static fromValue<T>(value: T): IProvider<T> {
    const mappers = isConstructor(value) ? (getTransformers(value as constructor<T>) ?? []) : [];
    return new Provider(() => value).pipe(...mappers);
  }

  static fromKey<T>(key: DependencyKey) {
    return new Provider<T>((c) => c.resolve(key));
  }

  private argsFn: ArgsFn = () => [];
  private isVisibleWhen: ChildrenVisibilityPredicate = () => true;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
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
