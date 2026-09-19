import { resolveConstructor } from './target';

export const addMethodMeta =
  <T>(key: string, mapFn: (prev: T | undefined) => T): MethodDecorator =>
  (target, propertyKey) => {
    const metadata: T | undefined = Reflect.getMetadata(key, target.constructor, propertyKey);
    Reflect.defineMetadata(key, mapFn(metadata), target.constructor, propertyKey);
  };
export const getMethodMeta = (key: string, target: object, propertyKey: string): unknown =>
  Reflect.getMetadata(key, resolveConstructor(target), propertyKey);

export const addMethodLabel = (key: string, label: string) =>
  addMethodMeta('label', (prev: Map<string, string> = new Map()) => prev.set(key, label));
export const getMethodLabels = (target: object, propertyKey: string): Map<string, string> =>
  (getMethodMeta('label', target, propertyKey) as Map<string, string> | undefined) ?? new Map();

export const addMethodTag = (tag: string) => addMethodMeta('tag', (prev: Set<string> = new Set()) => prev.add(tag));
export const getMethodTags = (target: object, propertyKey: string): Set<string> =>
  (getMethodMeta('tag', target, propertyKey) as Set<string> | undefined) ?? new Set();

/**
 * Applies several method decorators as one, so a stack repeated on many members
 * can be given a name:
 *
 * ```typescript
 * const handler = (event: string) =>
 *   createComposeMethodDecorator(addMethodTag('handler'), addMethodMeta('event', () => event));
 * ```
 *
 * Decorators are applied bottom-up, exactly as stacking them would be, so
 * `@createComposeMethodDecorator(a, b)` behaves like `@a @b`.
 *
 * The property descriptor is threaded through the chain the way the runtime
 * threads it: a decorator which returns a replacement descriptor hands it to the
 * next one, and the last replacement is returned. That is what makes wrapping
 * decorators such as `@once` or `@throttle` compose here.
 */
export const createComposeMethodDecorator =
  (...decorators: MethodDecorator[]): MethodDecorator =>
  (target, propertyKey, descriptor) =>
    decorators.reduceRight((acc, decorate) => decorate(target, propertyKey, acc) ?? acc, descriptor);
