import type { DiscoveredClass } from './scan';

/**
 * A heuristic for "two selected classes bind the same token": when the decorator's
 * first argument is a plain identifier, equal identifiers are almost always the same
 * token, and registration is last-wins, so one silently replaces the other. Purely
 * syntactic — aliased imports and computed keys are not resolved.
 *
 * Scope-gated classes (`@perPage('stations')`, `@perPage('sessions')`) share the
 * token but are not last-wins: the classes are distinguished by a decorator they
 * share called with different arguments, so each scope registers its own. Those
 * groups are not warned about.
 */
export function tokenCollisions(classes: DiscoveredClass[]): string[] {
  const owners = new Map<string, DiscoveredClass[]>();
  for (const cls of classes) {
    for (const token of cls.tokens) {
      const group = owners.get(token) ?? [];
      if (!group.some((owner) => owner.className === cls.className)) group.push(cls);
      owners.set(token, group);
    }
  }
  return [...owners]
    .filter(([, group]) => group.length > 1 && !scopeDisjoint(group))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([token, group]) => {
      const names = group.map((cls) => cls.className);
      return (
        `decorator token "${token}" is passed by ${names.join(', ')}; ` +
        `registration is last-wins, exclude one with classes.exclude`
      );
    });
}

/**
 * Whether a decorator shared by every class in a colliding group is called with
 * different arguments, e.g. `@perPage('stations')` vs `@perPage('sessions')`. Such
 * classes are scope-gated, not last-wins. Purely syntactic.
 */
function scopeDisjoint(group: DiscoveredClass[]): boolean {
  const [first, ...rest] = group;
  return first.decoratorCalls.some(({ name, args }) =>
    rest.every((cls) => {
      const same = cls.decoratorCalls.find((call) => call.name === name);
      return same !== undefined && same.args.join('\u0000') !== args.join('\u0000');
    }),
  );
}
