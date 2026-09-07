import { type constructor, Is } from '../utils/basic';
import { ProxyRegistry } from '../utils/ProxyRegistry';

/**
 * The class behind `target`: `target` itself when it is already a constructor,
 * otherwise the constructor of the instance.
 *
 * `target` may be a proxy (a `lazy()` provider hands one out) - it is unwrapped
 * first, because decorator metadata is defined on the real class and a proxy is
 * never that class. Every metadata read goes through here, so callers pass
 * whatever they hold - a class, an instance, or a proxy of one - and never
 * unwrap by hand.
 */
export function resolveConstructor(target: object): constructor<unknown> {
  const value = ProxyRegistry.getInstance().unwrap(target);
  return Is.constructor(value) ? value : (value.constructor as constructor<unknown>);
}
