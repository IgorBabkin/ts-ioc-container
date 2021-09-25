export const ILocatorContextKey = Symbol.for('ILocatorContext');
export interface ILocatorContext<T> {
    getValue(): T;
}
