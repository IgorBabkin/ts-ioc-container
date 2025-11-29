import { type CreateScopeOptions, type IContainer } from './container/IContainer';
import { toGroupAlias } from './token/GroupAliasToken';
import { FunctionToken } from './token/FunctionToken';
import { GroupInstanceToken, InstancePredicate } from './token/GroupInstanceToken';
import { toToken } from './token/toToken';

export const select = {
  alias: toGroupAlias,

  token: toToken,

  instances: (predicate: InstancePredicate = () => true) => new GroupInstanceToken(predicate),

  scope: {
    current: new FunctionToken((s) => s),

    create: (options: CreateScopeOptions) => new FunctionToken((s: IContainer) => s.createScope(options)),
  },
};
