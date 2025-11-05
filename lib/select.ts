import { type CreateScopeOptions, type IContainer } from './container/IContainer';
import { toAlias } from './token/AliasToken';
import { FunctionToken } from './token/FunctionToken';
import { InstanceListToken, InstancePredicate } from './token/InstanceListToken';
import { toToken } from './token/toToken';

export const select = {
  alias: toAlias,

  token: toToken,

  instances: (predicate: InstancePredicate = () => true) => new InstanceListToken(predicate),

  scope: {
    current: new FunctionToken((s) => s),

    create: (options: CreateScopeOptions) => new FunctionToken((s: IContainer) => s.createScope(options)),
  },
};
