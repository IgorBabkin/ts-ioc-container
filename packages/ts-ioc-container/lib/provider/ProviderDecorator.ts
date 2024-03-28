import { DependencyKey, IContainer, Resolvable } from '../container/IContainer';
import { IProvider } from './IProvider';
import { MapFn, pipe } from '../utils';

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  addAliases(...aliases: DependencyKey[]): this {
    this.decorated.addAliases(...aliases);
    return this;
  }

  hasAlias(alias: DependencyKey): boolean {
    return this.decorated.hasAlias(alias);
  }

  abstract clone(): IProvider<T>;

  isValid(container: IContainer): boolean {
    return this.decorated.isValid(container);
  }

  resolve(container: Resolvable, ...args: any[]): T {
    return this.decorated.resolve(container, ...args);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }
}
