import { type CreateScopeOptions, type IContainer } from './container/IContainer';
import { toToken } from './token/InjectionToken';
import { toAlias } from './token/AliasToken';
import { FunctionToken } from './token/FunctionToken';
import { InstanceListToken, InstancePredicate } from './token/InstanceListToken';

export const select = {
  alias: toAlias,

  token: toToken,

  instances: (predicate: InstancePredicate = () => true) => new InstanceListToken(predicate),

  scope: {
    current: (container: IContainer) => new FunctionToken((s) => s),

    create: (options: CreateScopeOptions) => new FunctionToken((l: IContainer) => l.createScope(options)),
  },
};
