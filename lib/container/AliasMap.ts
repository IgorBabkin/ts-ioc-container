import { DependencyKey } from './IContainer';
import { lastOf } from '../utils';

export type Alias = DependencyKey;

export class AliasMap {
  private readonly aliasToKeySet = new Map<DependencyKey, Set<Alias>>();

  deleteKeyFromAliases(key: DependencyKey): void {
    for (const [depKey, aliasSet] of [...this.aliasToKeySet].filter(([k, aliasSet]) => aliasSet.has(key))) {
      aliasSet.delete(key);
      if (aliasSet.size === 0) {
        this.aliasToKeySet.delete(depKey);
      }
    }
  }

  findManyKeysByAlias(alias: DependencyKey, excluded: Set<DependencyKey> = new Set()): DependencyKey[] {
    return [...(this.aliasToKeySet.get(alias) ?? [])].filter((k) => !excluded.has(k));
  }

  findLastKeyByAlias(alias: DependencyKey): DependencyKey | undefined {
    const keys = [...(this.aliasToKeySet.get(alias) ?? [])];
    return keys.length > 0 ? lastOf(keys) : undefined;
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

  has(keyOrAlias: DependencyKey): boolean {
    return this.aliasToKeySet.has(keyOrAlias);
  }
}
