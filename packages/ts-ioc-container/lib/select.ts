import { type CreateScopeOptions } from './container/IContainer';
import { toGroupAlias } from './token/GroupAliasToken';
import { FunctionToken } from './token/FunctionToken';
import { GroupInstanceToken, InstancePredicate } from './token/GroupInstanceToken';
import { toToken } from './token/toToken';

export const select = {
  alias: toGroupAlias,

  token: toToken,

  instances: (predicate: InstancePredicate = () => true) => new GroupInstanceToken(predicate),

  scope: {
    current: new FunctionToken(({ scope }) => scope),

    create: (options: CreateScopeOptions) => new FunctionToken(({ scope }) => scope.createScope(options)),
  },
};
