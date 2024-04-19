import { Cache } from './Cache';

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
