import { type constructor, type Instance, Is } from '../utils/basic';
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
 * The branch tests for a constructor rather than for an instance: `Is.instance`
 * asks for an *own* `constructor` property, which a prototype has and an
 * instance does not - its own `constructor` lives one level up the chain.
 *
 * Every metadata read goes through here, so callers pass whatever they hold - a
 * class, an instance, or a proxy of either - and never unwrap by hand.
 */
export function resolveConstructor(target: constructor<unknown> | Instance): constructor<unknown> {
  const value = unwrapProxy(target);
  return Is.constructor(value) ? value : (value.constructor as constructor<unknown>);
}
