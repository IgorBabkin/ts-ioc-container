import { IContainer, Tagged } from '../container/IContainer';
import { ChildrenVisibilityPredicate, IProvider, ScopePredicate } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setScopePredicate(isValidWhen: ScopePredicate): this {
    this.decorated.setScopePredicate(isValidWhen);
    return this;
  }

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.decorated.setVisibility(predicate);
    return this;
  }

  abstract clone(): IProvider<T>;

  isValidToClone(container: Tagged): boolean {
    return this.decorated.isValidToClone(container);
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
}
