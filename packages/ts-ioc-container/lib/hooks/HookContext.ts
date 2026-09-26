import type { IContainer } from '../container/IContainer';

import { type Instance } from '../utils/basic';
import { resolveArgs } from '../injector/MetadataInjector';
import { type InjectFn } from './hook';

/**
 * What a hook receives: the `instance`, the `scope` and the decorated member's
 * name. `invokeMethod({ args: resolveArgs() })` calls the member with its
 * `@inject` parameters; `setProperty(fn)` assigns it (see `injectProp`).
 */
export interface IHookContext {
  instance: Instance;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod(options?: { args?: unknown[] }): unknown;

  setProperty(fn: InjectFn): void;

  getProperty(): unknown;

  setInitialArgs(...args: unknown[]): this;

  getInitialArgs(): unknown[];
}

/** The default {@link IHookContext}. */
export class HookContext implements IHookContext {
  private initialArgs: unknown[] = [];

  constructor(
    readonly instance: Instance,
    readonly scope: IContainer,
    readonly methodName?: string,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(
      this.instance,
      this.methodName,
    )({
      scope: this.scope,
      args: [...this.initialArgs, ...args],
    });
  }

  invokeMethod({ args = this.resolveArgs() }: { args?: unknown[] } = {}): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  setProperty(fn: InjectFn): void {
    // @ts-ignore
    this.instance[this.methodName] = fn({ scope: this.scope });
  }

  getProperty(): unknown {
    // @ts-ignore
    return this.instance[this.methodName];
  }

  setInitialArgs(...args: unknown[]): this {
    this.initialArgs = args;
    return this;
  }

  getInitialArgs(): unknown[] {
    return this.initialArgs;
  }
}

/** Builds the context a hook receives. */
export type CreateHookExecutionContext = (Target: Instance, scope: IContainer, methodName?: string) => IHookContext;
/** The default {@link CreateHookExecutionContext}: a {@link HookContext}. */
export const createHookExecutionContext: CreateHookExecutionContext = (Target, scope, methodName = 'constructor') =>
  new HookContext(Target, scope, methodName);

/** A {@link CreateHookExecutionContext} whose contexts start with `args` as initial args. */
export const createHookContextFactory =
  ({ args = [] }: { args?: unknown[] } = {}): CreateHookExecutionContext =>
  (Target, scope, methodName) =>
    createHookExecutionContext(Target, scope, methodName).setInitialArgs(...args);
