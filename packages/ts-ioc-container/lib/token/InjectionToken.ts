import { type IContainer, type Tag } from '../container/IContainer';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';
import { Is } from '../utils/basic';

/**
 * The default `getArgsFn` of every token: the runtime `args` a token is
 * resolved with reach the provider as they are, and `token.args(...)` /
 * `token.argsFn(...)` append after them.
 */
export const forwardArgs: ArgsFn = (_, { args = [] } = {}) => args;

export abstract class InjectionToken<T = any> {
  private readonly tags: Set<Tag>;

  protected constructor(tags: Tag[] = []) {
    this.tags = new Set(tags);
  }

  abstract resolve(s: IContainer, options?: ProviderOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
  abstract addTags(...tags: Tag[]): InjectionToken<T>;

  hasTag(tag: Tag): boolean {
    return this.tags.has(tag);
  }

  protected getTags(): Tag[] {
    return [...this.tags];
  }
}

export function isInjectionToken<T = any>(target: unknown): target is InjectionToken<T> {
  return (
    Is.object(target) &&
    'resolve' in target &&
    'args' in target &&
    'argsFn' in target &&
    'lazy' in target &&
    'hasTag' in target &&
    'addTags' in target
  );
}
