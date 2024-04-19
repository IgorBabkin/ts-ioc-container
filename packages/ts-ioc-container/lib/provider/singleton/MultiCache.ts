import { Cache } from './Cache';

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
