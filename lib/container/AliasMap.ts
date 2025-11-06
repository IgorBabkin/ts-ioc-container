import { type DependencyKey } from './IContainer';

export type Alias = DependencyKey;

export class AliasMap {
  private readonly aliasToKeySet = new Map<Alias, Set<DependencyKey>>();

  getKeysByAlias(alias: DependencyKey): DependencyKey[] {
    return [...(this.aliasToKeySet.get(alias) ?? [])];
  }

  setAliasesByKey(key: DependencyKey, aliases: DependencyKey[]): void {
    // reset existing key's aliases
    for (const [alias, keySet] of this.aliasToKeySet) {
      keySet.delete(key);
      if (keySet.size === 0) {
        this.aliasToKeySet.delete(alias);
      }
    }

    for (const alias of aliases) {
      const dependencyKeySet = this.aliasToKeySet.get(alias) ?? new Set();
      this.aliasToKeySet.set(alias, dependencyKeySet.add(key));
    }
  }

  destroy(): void {
    this.aliasToKeySet.clear();
  }
}
