import { IContainer } from '../container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;
export type InjectOptions = { lazy: boolean; args: unknown[] };
export type ArgsFn = (l: IContainer) => unknown[];

export abstract class InjectionResolver<T> {
  #isLazy: boolean = false;
  #argsFn: ArgsFn = () => [];

  args(...deps: unknown[]): this {
    this.#argsFn = () => deps;
    return this;
  }

  argsFn(fn: ArgsFn): this {
    this.#argsFn = fn;
    return this;
  }

  lazy(): this {
    this.#isLazy = true;
    return this;
  }

  resolve(s: IContainer): T {
    return this.resolveByOptions(s, {
      lazy: this.#isLazy,
      args: this.#argsFn(s),
    });
  }

  protected abstract resolveByOptions(s: IContainer, options: InjectOptions): T;
}
