import { type CreateHookContext } from '../HookContext';
import type { IContainer } from '../../container/IContainer';

export type HooksRunnerContext = {
  scope: IContainer;
  createContext?: CreateHookContext;
  predicate?: (methodName: string) => boolean;
};
