import { Provider } from './Provider';
import { type constructor } from '../utils/basic';

/**
 * The provider a container makes up to reach the injector.
 *
 * A class resolved by its constructor — `container.resolve(SomeClass)` — has no
 * registration behind it and so no provider of its own. The container creates
 * one on the first such resolve, over `construct`: the raw injector step.
 *
 * What it hands out is the pure injector value — or a lazy proxy of it, when
 * the resolve asked for one. Nothing else: no decorators, no cache, no access
 * rules, no args functions, because there is no registration to declare any.
 * Hence transient — a new instance leaves it on every resolve, and nothing can
 * configure it otherwise. A class that needs a singleton, pipes, or visibility
 * rules needs a registration, and is then resolved by its key.
 *
 * It exists so that provider-level behavior reaches those classes anyway. The
 * container announces it to `onProviderRegistered` like a registered provider,
 * which is what lets `onResolved` hooks run for a class nobody registered.
 *
 * A container keeps one per class, for the life of that scope. Identity is the
 * constructor itself rather than `Target.name`: two classes can share a name
 * (and minifiers make that likely), and a name would collide with a
 * registration bound to the same string.
 *
 * Being its own type also makes it recognizable, so a hook can tell a made-up
 * provider from a declared one:
 *
 * ```typescript
 * container.onProviderRegistered((provider) => {
 *   if (provider instanceof TransientProvider) return; // declared registrations only
 * });
 * ```
 */
export class TransientProvider<T = any> extends Provider<T> {
  constructor(Target: constructor<T>) {
    super((container, options) => container.construct(Target, options));
  }
}
