export type constructor<T> = new (...args: any[]) => T;
export type Fn = () => void;
export type Factory<T> = (...args: any[]) => T;
