import type { IContainer } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { type HookFn, type HookType, toHookFn } from './hook';

/**
 * A {@link ProviderHook} narrowed to the dependencies that can carry hook metadata.
 */
export type ResolvedObjectHook = (dependency: object, scope: IContainer) => void;

export const oncePerInstance = (execute: HookType): HookFn => {
  const invokedInstances = new WeakSet<object>();

  return (context) => {
    if (invokedInstances.has(context.instance)) {
      return;
    }

    invokedInstances.add(context.instance);
    return toHookFn(execute)(context);
  };
};
