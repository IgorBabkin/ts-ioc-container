import { Provider } from './Provider';
import { type constructor } from '../utils/basic';

/**
 * Internal. An ad-hoc provider the container creates to adapt an injector value
 * to the provider interface.
 *
 * `resolve` takes a `DependencyKey` or a constructor. A key arrives with a
 * provider behind it; a constructor arrives with nothing, so the container wraps
 * one around `construct` and `resolve` has a single path either way. That the
 * wrapper is also what `onProviderRegistered` hooks see — and so what lets
 * `onResolved` reach an unregistered class — falls out of it.
 *
 * Being an adapter and not a registration, it carries nothing: no decorators,
 * no cache, no access rules, no args functions. It hands over the pure injector
 * value, or a lazy proxy of it when the resolve asked for one, and a new
 * instance leaves it on every resolve. A class that needs a singleton, pipes, or
 * visibility rules needs a registration, and is then resolved by its key.
 *
 * Held per class per scope in `Container.transientProviders` — a map of its own,
 * which is what keeps `resolve(Logger)` and `resolve('Logger')` independent —
 * and keyed there by the constructor rather than `Target.name`, so two
 * same-named classes get one each.
 *
 * Not exported. Consumers never construct one.
 */
export class TransientProvider<T = any> extends Provider<T> {
  constructor(Target: constructor<T>) {
    super((container, options) => container.construct(Target, options));
  }
}
