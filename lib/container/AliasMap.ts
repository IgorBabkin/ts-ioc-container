import { type DependencyKey } from './IContainer';
import { List as L } from '../utils';

export type Alias = DependencyKey;

export class AliasMap {
  private readonly aliasToKeySet = new Map<DependencyKey, Set<Alias>>();

  deleteKeyFromAliases(key: DependencyKey): void {
    for (const [depKey, aliasSet] of [...this.aliasToKeySet].filter(([, aliasSet]) => aliasSet.has(key))) {
      aliasSet.delete(key);
      if (aliasSet.size === 0) {
        this.aliasToKeySet.delete(depKey);
      }
    }
  }

  findManyKeysByAlias(alias: DependencyKey): DependencyKey[] {
    return [...(this.aliasToKeySet.get(alias) ?? [])];
  }

  findLastKeyByAlias(alias: DependencyKey): DependencyKey | undefined {
    const keys = [...(this.aliasToKeySet.get(alias) ?? [])];
    return keys.length > 0 ? L.lastOf(keys) : undefined;
  }

  addAliases(key: DependencyKey, aliases: DependencyKey[]): void {
    for (const alias of aliases) {
      const currentAliasKeys = this.aliasToKeySet.get(alias) ?? new Set();
      this.aliasToKeySet.set(alias, currentAliasKeys.add(key));
    }
  }

  destroy(): void {
    this.aliasToKeySet.clear();
  }
}
