import type { IContainer } from '../container/IContainer';

import { resolveArgs } from '../injector/inject';
import { InjectionToken } from '../token/InjectionToken';
import { type constructor } from '../utils/basic';

export interface IHookContext {
  instance: object;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod(options?: { args?: unknown[] }): unknown;

  setProperty(fn: InjectionToken): void;

  setInitialArgs(...args: unknown[]): this;
}

export class HookContext implements IHookContext {
  private initialArgs: unknown[] = [];

  constructor(
    public instance: object,
    public scope: IContainer,
    public methodName?: string,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance.constructor as constructor<unknown>, this.methodName)(
      this.scope,
      ...[...this.initialArgs, ...args],
    );
  }

  invokeMethod({ args = this.resolveArgs() }: { args?: unknown[] } = {}): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  setProperty(fn: InjectionToken): void {
    // @ts-ignore
    this.instance[this.methodName] = fn.resolve(this.scope);
  }

  setInitialArgs(...args: unknown[]): this {
    this.initialArgs = args;
    return this;
  }
}

export type CreateHookContext = (Target: object, scope: IContainer, methodName?: string) => IHookContext;
export const createHookContext: CreateHookContext = (Target, scope, methodName = 'constructor') =>
  new HookContext(Target, scope, methodName);
