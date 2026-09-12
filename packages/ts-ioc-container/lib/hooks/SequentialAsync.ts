import { HookExecutionStrategy, type MemberHook } from './HookExecutionStrategy';
import { runInOrder } from '../utils/task';

/**
 * Runs members one after another, in declaration order: a member whose hook goes
 * async is awaited before the next member starts. Use it when a later member
 * depends on what an earlier one set up.
 */
export class SequentialAsync extends HookExecutionStrategy {
  protected processHooks(members: MemberHook[]): void | Promise<void> {
    return runInOrder(
      members.map(
        ({ hook, context }) =>
          () =>
            hook(context),
      ),
    );
  }
}
