export interface Cache<K, V> {
  getKey(...args: unknown[]): K;

  hasValue(key: K): boolean;

  getValue(key: K): V;

  setValue(key: K, value: V): void;
}

export class MultiCache<K, V> implements Cache<K, V> {
  private instances = new Map<K, V>();

  constructor(readonly getKey: (...args: unknown[]) => K = () => '1' as K) {}

  hasValue(token: K): boolean {
    return this.instances.has(token);
  }

  getValue(token: K): V {
    return this.instances.get(token) as V;
  }

  setValue(token: K, value: V): void {
    this.instances.set(token, value);
  }
}

export const multiCache = <K, V>(getKey: (...args: unknown[]) => K) => new MultiCache<K, V>(getKey);

export class SingleCache<V> implements Cache<string, V> {
  private instance?: { value: V };

  getKey(...args: unknown[]): string {
    return '1';
  }

  getValue(key: string): V {
    return this.instance!.value;
  }

  hasValue(key: string): boolean {
    return this.instance !== undefined;
  }

  setValue(key: string, value: V): void {
    this.instance = { value };
  }
}
