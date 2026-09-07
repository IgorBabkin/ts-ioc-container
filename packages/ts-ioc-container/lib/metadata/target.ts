import { type constructor, Is } from '../utils/basic';
import { unwrapProxy } from '../utils/ProxyRegistry';

/**
 * The class behind `target`: `target` itself when it is already a constructor,
 * otherwise the constructor of the instance.
 *
 * `target` may be a proxy (a `lazy()` provider hands one out), and it is
 * unwrapped before either branch, because metadata is defined on the real class
 * and a proxy is never that class. A proxied class misses the lookup outright,
 * standing in for the very object metadata is keyed by; a proxied instance would
 * only answer `constructor` correctly if its handler forwards the read, which a
 * custom one need not do.
 *
 * Every metadata read goes through here, so callers pass whatever they hold - a
 * class, an instance, or a proxy of either - and never unwrap by hand.
 */
export function resolveConstructor(target: object): constructor<unknown> {
  const value = unwrapProxy(target);
  return Is.constructor(value) ? value : (value.constructor as constructor<unknown>);
}
