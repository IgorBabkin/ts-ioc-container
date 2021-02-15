export type constructor<T> = new (...args: any[]) => T;
export type Factory<T> = (...args: any[]) => T;
