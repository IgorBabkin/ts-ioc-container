import { AsyncHookExecutionStrategy } from './AsyncHookExecutionStrategy';
import { type MemberHooks } from './HookExecutionStrategy';

/**
 * Starts every member in declaration order without waiting for the previous
 * one: members whose hooks go async run concurrently. Use it when members are
 * independent of each other.
 */
export class ParallelAsync extends AsyncHookExecutionStrategy {
  protected processHooks(members: MemberHooks[]): void | Promise<void> {
    const pending: Promise<void>[] = [];
    for (const member of members) {
      const result = this.runMember(member);
      if (result) {
        pending.push(result);
      }
    }
    return pending.length > 0 ? Promise.all(pending).then(() => undefined) : undefined;
  }
}
