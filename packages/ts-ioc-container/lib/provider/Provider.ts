import { VisibilityPredicate, IProvider, ResolveDependency } from './IProvider';
import { Resolvable, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

const PROVIDER_KEY = 'provider';

export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);
export const setVisibility =
  (isVisibleWhen: VisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);

export class Provider<T> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    const mappers = getMetadata<MapFn<IProvider<T>>[]>(Target, PROVIDER_KEY) ?? [];
    return new Provider((container, ...args) => container.resolve(Target, { args })).pipe(...mappers);
  }

  static fromValue<T>(value: T): Provider<T> {
    return new Provider(() => value);
  }

  constructor(
    private readonly resolveDependency: ResolveDependency<T>,
    private isVisibleWhen: VisibilityPredicate = () => true,
  ) {}

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  clone(): Provider<T> {
    return new Provider(this.resolveDependency, this.isVisibleWhen);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.resolveDependency(container, ...args);
  }

  setVisibility(isVisibleWhen: VisibilityPredicate): this {
    this.isVisibleWhen = isVisibleWhen;
    return this;
  }

  isVisible(parent: Tagged, child: Tagged): boolean {
    return this.isVisibleWhen(parent, child);
  }

  isValidToClone(): boolean {
    return true;
  }
}
