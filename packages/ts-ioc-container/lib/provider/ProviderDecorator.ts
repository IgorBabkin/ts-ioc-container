import { Alias, AliasPredicate, IContainer, Tagged } from '../container/IContainer';
import { ChildrenVisibilityPredicate, IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.decorated.setVisibility(predicate);
    return this;
  }

  isVisible(parent: IContainer, child: Tagged): boolean {
    return this.decorated.isVisible(parent, child);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    return this.decorated.resolve(container, ...args);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  matchAliases(predicate: AliasPredicate): boolean {
    return this.decorated.matchAliases(predicate);
  }

  addAliases(...aliases: Alias[]): this {
    this.decorated.addAliases(...aliases);
    return this;
  }
}
