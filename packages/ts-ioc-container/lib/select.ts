import { type CreateScopeOptions } from './container/IContainer';
import { toGroupAlias } from './token/GroupAliasToken';
import { FunctionToken } from './token/FunctionToken';
import { GroupInstanceToken, InstancePredicate } from './token/GroupInstanceToken';
import { toToken } from './token/toToken';

/**
 * Shortcuts for common tokens.
 *
 * - `select.token(x)` - `toToken(x)`
 * - `select.alias('Key')` - a {@link GroupAliasToken}
 * - `select.instances(predicate)` - instances already created in the scope
 * - `select.scope.current` - the resolving scope itself
 * - `select.scope.create({ tags })` - a new child scope
 *
 * @example
 * class Handler {
 *   constructor(@inject(by(select.scope.current)) private scope: IContainer) {}
 * }
 */
export const select = {
  alias: toGroupAlias,

  token: toToken,

  instances: (predicate: InstancePredicate = () => true) => new GroupInstanceToken(predicate),

  scope: {
    current: new FunctionToken(({ scope }) => scope),

    create: (options: CreateScopeOptions) => new FunctionToken(({ scope }) => scope.createScope(options)),
  },
};
