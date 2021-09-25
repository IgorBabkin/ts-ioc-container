// eslint-disable-next-line @typescript-eslint/no-explicit-any

export type constructor<T> = new (...args: unknown[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;

export interface Locator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve<T>(key: InjectionToken<T>, ...deps: unknown[]): T;
  createScope<T>(context?: T): Locator;
  remove(): void;
}
