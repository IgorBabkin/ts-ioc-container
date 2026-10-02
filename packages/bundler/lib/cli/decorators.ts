import { hook, type HookType, sequential } from 'ts-ioc-container';

export const DEFAULT_ACTION = 'default';

/**
 * Registers a method as a named CLI action: `@action('check', invoke)` makes
 * `tic <command> check` run it. Several hooks run in declaration order.
 */
export const action = (name: string, ...hooks: HookType[]) => hook(name, sequential(...hooks));

/** Runs when the command is invoked without an action name. */
export const onDefault = (...hooks: HookType[]) => action(DEFAULT_ACTION, ...hooks);
