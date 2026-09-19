import { resolveConstructor } from './target';

export const addClassMeta =
  <T>(key: string | symbol, mapFn: (prev: T | undefined) => T): ClassDecorator =>
  (target) => {
    const value: T | undefined = Reflect.getOwnMetadata(key, target);
    Reflect.defineMetadata(key, mapFn(value), target);
  };

export function getClassMeta<T>(target: object, key: string | symbol): T | undefined {
  return Reflect.getOwnMetadata(key, resolveConstructor(target));
}

export const addClassLabel = (key: string, label: string) =>
  addClassMeta('label', (prev: Map<string, string> = new Map()) => prev.set(key, label));
export const getClassLabels = (target: object): Map<string, string> => getClassMeta(target, 'label') ?? new Map();

export const addClassTag = (tag: string) => addClassMeta('tag', (prev: Set<string> = new Set()) => prev.add(tag));
export const getClassTags = (target: object): Set<string> => getClassMeta(target, 'tag') ?? new Set();

/**
 * Applies several class decorators as one, so a stack repeated on many classes
 * can be given a name:
 *
 * ```typescript
 * const repository = <T>(token: SingleToken<T>, ...mappers: RegistrationMapper<T>[]) =>
 *   createComposeClassDecorator(
 *     register(IRepositoryToken, token, addMediator(token), ...mappers),
 *     addClassMeta('injection-token', () => token),
 *   );
 * ```
 *
 * Decorators are applied bottom-up, exactly as stacking them would be, so
 * `@createComposeClassDecorator(a, b)` behaves like `@a @b` - moving a stack into one
 * call never changes which decorator writes its metadata first.
 *
 * A decorator which returns a replacement class hands it to the next one, and
 * the last replacement is returned - the same threading the runtime does for a
 * stack.
 */
export const createComposeClassDecorator =
  (...decorators: ClassDecorator[]): ClassDecorator =>
  (target) =>
    decorators.reduceRight((acc, decorate) => decorate(acc) ?? acc, target);
