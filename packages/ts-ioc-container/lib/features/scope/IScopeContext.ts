export const IScopeContextKey = Symbol.for('IScopeContext');
export interface IScopeContext<T> {
    getValue(): T;
}
