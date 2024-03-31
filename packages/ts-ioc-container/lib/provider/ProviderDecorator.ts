import { Resolvable, Tagged } from '../container/IContainer';
import { IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  hideFromChildren(): this {
    this.decorated.hideFromChildren();
    return this;
  }

  abstract clone(): IProvider<T>;

  isValid(container: Tagged): boolean {
    return this.decorated.isValid(container);
  }

  resolve(container: Resolvable, ...args: any[]): T {
    return this.decorated.resolve(container, ...args);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }
}
