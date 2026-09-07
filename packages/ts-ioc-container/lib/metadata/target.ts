import { type constructor, Is } from '../utils/basic';
import { ProxyRegistry } from '../utils/ProxyRegistry';

/**
 * The class behind `target`: `target` itself when it is already a constructor,
 * otherwise the constructor of the instance.
 *
 * `target` may be a proxy (a `lazy()` provider hands one out), and decorator
 * metadata is defined on the real class - a proxy is never that class. Only a
 * proxied constructor has to be unwrapped, though: it stands in for the class
 * itself, which is the key metadata is read from. An instance is not that key,
 * and reading `constructor` off a proxy of one already forwards to the real
 * class, so it needs no unwrapping.
 *
 * Every metadata read goes through here, so callers pass whatever they hold - a
 * class, an instance, or a proxy of either - and never unwrap by hand.
 */
export function resolveConstructor(target: object): constructor<unknown> {
  return Is.constructor(target)
    ? ProxyRegistry.getInstance().unwrap(target)
    : (target.constructor as constructor<unknown>);
}
