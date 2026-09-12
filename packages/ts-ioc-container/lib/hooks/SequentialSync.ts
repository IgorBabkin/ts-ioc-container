import { HookExecutionStrategy, type MemberHook } from './HookExecutionStrategy';

/**
 * Runs every member's hook one after another and never awaits: everything it
 * ran has finished when `execute` returns. A hook which returns a promise is
 * started but not observed — declare such hooks under an async strategy instead.
 */
export class SequentialSync extends HookExecutionStrategy {
  protected processHooks(members: MemberHook[]): void {
    for (const { hook, context } of members) {
      hook(context);
    }
  }
}
