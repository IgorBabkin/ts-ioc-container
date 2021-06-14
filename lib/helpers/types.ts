export type constructor<T> = new (...args: any[]) => T;
export type Fn<A = void, B = void> = (a: A) => B;
export type Factory<T> = (...args: any[]) => T;
