export type constructor<T> = new (...args: any[]) => T;

export interface InstanceOfClass<T = unknown> {
  new (...args: unknown[]): T;
}

export interface Instance<T = unknown> {
  new (...args: unknown[]): T;
}

export type MapFn<T> = (value: T) => T;
