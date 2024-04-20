export interface IContext<T> {
  getValue(): T;

  setValue(value: T): void;

  hasValue(): boolean;
}
