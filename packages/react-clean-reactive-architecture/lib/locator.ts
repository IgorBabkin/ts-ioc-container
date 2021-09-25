// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { IScopeContext } from './scope/IScopeContext';

export type constructor<T> = new (...args: any[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;

export interface Locator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
  createScope<T>(context?: IScopeContext<T>): Locator;
  remove(): void;
}
