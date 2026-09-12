import { HookExecutionStrategy, type MemberHook } from './HookExecutionStrategy';
import { runAtOnce } from '../utils/task';

/**
 * Starts every member in declaration order without waiting for the previous
 * one: members whose hooks go async run concurrently. Use it when members are
 * independent of each other.
 */
export class ParallelAsync extends HookExecutionStrategy {
  protected processHooks(members: MemberHook[]): void | Promise<void> {
    return runAtOnce(
      members.map(
        ({ hook, context }) =>
          () =>
            hook(context),
      ),
    );
  }
}
