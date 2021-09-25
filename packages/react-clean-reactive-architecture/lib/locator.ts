export type constructor<T> = new (...args: unknown[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, ...deps: unknown[]): T;
}
