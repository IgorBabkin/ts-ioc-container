import { Alias, IProvider, ResolveDependency } from './IProvider';
import { DependencyKey, Resolvable } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

const PROVIDER_KEY = 'provider';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, ...args)).pipe(...mappers);
  }

  static fromValue<T>(value: T): Provider<T> {
    return new Provider(() => value);
  }

  private aliases: Set<Alias> = new Set();

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  addAliases(...aliases: Alias[]): this {
    for (const alias of aliases) {
      this.aliases.add(alias);
    }
    return this;
  }

  hasAlias(alias: Alias): boolean {
    return this.aliases.has(alias);
  }

  clone(): Provider<T> {
    return new Provider(this.resolveDependency);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  isValid(): boolean {
    return true;
  }
}
