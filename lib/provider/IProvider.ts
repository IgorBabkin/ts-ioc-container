import { IContainer, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';
import { isProviderMapper, ProviderMapper, RegistrationMapper } from './ProviderMapper';

export type ProviderResolveOptions = { args: unknown[]; lazy?: boolean };
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderResolveOptions) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];
export interface IMapper<T> {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderResolveOptions): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderMapper<T>)[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;

  setArgs(argsFn: ArgsFn): this;
}

class VisibleMapper<T> extends RegistrationMapper<T> {
  constructor(private isVisibleWhen: ChildrenVisibilityPredicate) {
    super();
  }

  mapProvider(p: IProvider<T>): IProvider<T> {
    return p.setVisibility(this.isVisibleWhen);
  }
}

class ArgsMapper<T> extends RegistrationMapper<T> {
  constructor(private argsFn: ArgsFn) {
    super();
  }

  mapProvider(provider: IProvider<T>): IProvider<T> {
    return provider.setArgs(this.argsFn);
  }
}

export const args = <T>(...extraArgs: unknown[]) => new ArgsMapper<T>(() => extraArgs);

export const argsFn = <T>(fn: ArgsFn) => new ArgsMapper<T>(fn);

export const visible = <T>(isVisibleWhen: ChildrenVisibilityPredicate) => new VisibleMapper<T>(isVisibleWhen);

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.decorated.setVisibility(predicate);
    return this;
  }

  isVisible(parent: IContainer, child: Tagged): boolean {
    return this.decorated.isVisible(parent, child);
  }

  resolve(container: IContainer, options: ProviderResolveOptions): T {
    return this.decorated.resolve(container, options);
  }

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderMapper<T>)[]): IProvider<T> {
    const fns = mappers.map((m): MapFn<IProvider<T>> => {
      if (isProviderMapper<T>(m)) {
        return m.mapProvider.bind(m);
      }
      return m;
    });
    this.decorated = this.decorated.pipe(...fns);
    return this;
  }

  setArgs(argsFn: ArgsFn): this {
    this.decorated.setArgs(argsFn);
    return this;
  }
}
