// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type constructor<T> = new (...args: any[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;

export interface Resolvable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
}
