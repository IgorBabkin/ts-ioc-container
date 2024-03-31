import { IContainer, Resolvable, Tagged } from '../container/IContainer';
import { VisibilityPredicate, IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setVisibility(predicate: VisibilityPredicate): this {
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

  resolve(container: Resolvable, ...args: any[]): T {
    return this.decorated.resolve(container, ...args);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }
}
