export interface Cache<K, V> {
  getKey(...args: unknown[]): K;

  hasValue(key: K): boolean;

  getValue(key: K): V;

  setValue(key: K, value: V): void;
}
