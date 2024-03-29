import { IContainer, Resolvable, Tagged } from '../container/IContainer';
import { Alias, IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  addAliases(...aliases: Alias[]): this {
    this.decorated.addAliases(...aliases);
    return this;
  }

  hasAlias(alias: Alias): boolean {
    return this.decorated.hasAlias(alias);
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
