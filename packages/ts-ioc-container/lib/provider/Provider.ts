import { ArgsFn, ChildrenVisibilityPredicate, getTransformers, IProvider, ResolveDependency } from './IProvider';
import { Alias, AliasPredicate, IContainer, Tagged } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const transformers = getTransformers(Target);
    return new Provider((container, ...args) => container.resolve(Target, { args })).pipe(...transformers);
  }

  static fromValue<T>(value: T): IProvider<T> {
    const mappers = isConstructor(value) ? getTransformers(value as constructor<T>) ?? [] : [];
    return new Provider(() => value).pipe(...mappers);
  }

  private readonly aliases: Set<Alias> = new Set();
  private argsFn: ArgsFn = () => [];
  private isVisibleWhen: ChildrenVisibilityPredicate = () => true;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    return this.resolveDependency(container, ...this.argsFn(container, ...args), ...args);
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
