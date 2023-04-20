export type constructor<T> = new (...args: any[]) => T;

export type MapFn<T> = (value: T) => T;
