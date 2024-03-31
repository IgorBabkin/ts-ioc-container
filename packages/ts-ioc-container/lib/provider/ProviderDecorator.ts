import { IContainer, Resolvable, Tagged } from '../container/IContainer';
import { ChildrenPredicate, IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  hideFromChildren(predicate: ChildrenPredicate): this {
    this.decorated.hideFromChildren(predicate);
    return this;
  }

  abstract clone(): IProvider<T>;

  isValidToClone(container: Tagged): boolean {
    return this.decorated.isValidToClone(container);
  }

  isValidToResolve(container: IContainer, child?: Tagged): boolean {
    return this.decorated.isValidToResolve(container, child);
  }

  resolve(container: Resolvable, ...args: any[]): T {
    return this.decorated.resolve(container, ...args);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }
}
