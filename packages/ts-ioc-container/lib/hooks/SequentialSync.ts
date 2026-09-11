import { HookExecutionStrategy, type MemberHooks } from './HookExecutionStrategy';

/**
 * Runs every member, and every hook of a member, one after another and never
 * awaits: everything it ran has finished when `execute` returns. A hook which
 * returns a promise is started but not observed — declare such hooks under an
 * async strategy instead.
 */
export class SequentialSync extends HookExecutionStrategy {
  protected processHooks(members: MemberHooks[]): void {
    for (const { hooks, context } of members) {
      for (const hook of hooks) {
        hook(context);
      }
    }
  }
}
