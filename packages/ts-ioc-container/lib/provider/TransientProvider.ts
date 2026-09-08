import { Provider } from './Provider';
import { type constructor } from '../utils/basic';

/**
 * Internal. The provider a container makes up for a class resolved by its
 * constructor, so that `resolve` has one path instead of two.
 *
 * `resolve` takes a `DependencyKey` or a constructor. A key arrives with a
 * provider behind it; a constructor arrives with nothing, and used to be
 * special-cased straight into the injector — a second resolution path that
 * skipped everything providers do. Standing the class up behind a provider
 * removes the special case: both kinds of target now find a provider, check
 * access, and resolve it.
 *
 * What this one hands out is the pure injector value, or a lazy proxy of it when
 * the resolve asked for one. Nothing else: no decorators, no cache, no access
 * rules, no args functions, because there is no registration to declare any.
 * Hence transient — a new instance leaves it on every resolve. A class that
 * needs a singleton, pipes, or visibility rules needs a registration, and is
 * then resolved by its key.
 *
 * A container keeps one per class, for the life of that scope. Identity is the
 * constructor itself rather than `Target.name`: two classes can share a name
 * (and minifiers make that likely), and a name would collide with a
 * registration bound to the same string.
 *
 * Not exported from the package. Consumers never construct one; they observe it
 * only as the provider passed to an `onProviderRegistered` hook, which is what
 * lets `onResolved` hooks reach a class nobody registered.
 */
export class TransientProvider<T = any> extends Provider<T> {
  constructor(Target: constructor<T>) {
    super((container, options) => container.construct(Target, options));
  }
}
