import {
  ArgsFn,
  ChildrenVisibilityPredicate,
  getTransformers,
  IProvider,
  ProviderResolveOptions,
  ResolveDependency,
} from './IProvider';
import { Alias, AliasPredicate, DependencyKey, IContainer, Tagged } from '../container/IContainer';
import { constructor, isConstructor, lazyProxy, MapFn, pipe } from '../utils';

export class Provider<T = any> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const transformers = getTransformers(Target);
    return new Provider((container, options) => container.resolve(Target, options)).pipe(...transformers);
  }

  static fromValue<T>(value: T): IProvider<T> {
    const mappers = isConstructor(value) ? (getTransformers(value as constructor<T>) ?? []) : [];
    return new Provider(() => value).pipe(...mappers);
  }

  static fromKey<T>(key: DependencyKey) {
    return new Provider<T>((c) => c.resolve(key));
  }

  key?: DependencyKey;
  private readonly aliases: Set<Alias> = new Set();
  private argsFn: ArgsFn = () => [];
  private isVisibleWhen: ChildrenVisibilityPredicate = () => true;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  resolve(container: IContainer, { args, lazy: isLazy }: ProviderResolveOptions): T {
    const resolveDependency = () => {
      const deps = [...this.argsFn(container, ...args), ...args];
      return this.resolveDependency(container, { args: deps });
    };
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

  matchAliases(predicate: AliasPredicate): boolean {
    return this.aliases.size > 0 && predicate(this.aliases);
  }

  addAliases(...aliases: Alias[]): this {
    for (const alias of aliases) {
      this.aliases.add(alias);
    }
    return this;
  }
}
