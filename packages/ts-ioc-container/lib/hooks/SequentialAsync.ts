import { AsyncHookExecutionStrategy } from './AsyncHookExecutionStrategy';
import { type MemberHooks } from './HookExecutionStrategy';

/**
 * Runs members one after another, in declaration order: a member whose hooks go
 * async is awaited before the next member starts. Use it when a later member
 * depends on what an earlier one set up.
 */
export class SequentialAsync extends AsyncHookExecutionStrategy {
  protected processHooks(members: MemberHooks[], from = 0): void | Promise<void> {
    for (let i = from; i < members.length; i++) {
      const result = this.runMember(members[i]);
      if (result) {
        return result.then(() => this.processHooks(members, i + 1));
      }
    }
  }
}
