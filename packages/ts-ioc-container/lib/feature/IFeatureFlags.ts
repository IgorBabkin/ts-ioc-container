import { SingleToken } from '../token/SingleToken';

/**
 * What a flag is evaluated for - usually the current user. Shaped after the
 * Unleash context, so an Unleash client accepts it as is.
 */
export type FeatureContext = {
  userId?: string;
  sessionId?: string;
  remoteAddress?: string;
  environment?: string;
  properties?: Record<string, string | number | undefined>;
  [key: string]: unknown;
};

/** A variant served for a flag. Unleash reports `{ name: 'disabled', enabled: false }` for a flag that is off. */
export type FeatureVariant = { name: string; enabled: boolean };

/**
 * The flag client feature tokens ask: `getVariant` for a
 * `MultiVariantFeatureToken`, `isEnabled` for a `ToggleFeatureToken`.
 * Synchronous, because resolution is. An Unleash client satisfies it
 * structurally - register the instance itself; an asynchronous client
 * (OpenFeature server SDK) needs an adapter which evaluates ahead of time and
 * answers from that snapshot.
 *
 * @example
 * container.addRegistration(Registration.fromValue(unleash).bindTo(IFeatureFlagsToken));
 */
export interface IFeatureFlags {
  isEnabled(name: string, context?: FeatureContext): boolean;

  getVariant(name: string, context?: FeatureContext): FeatureVariant;
}

/** Where feature tokens find the flag client. */
export const IFeatureFlagsToken = new SingleToken<IFeatureFlags>('IFeatureFlags');

/**
 * Where feature tokens find the context to evaluate a flag for. Register it
 * in the scope that knows the user (e.g. `request`); register `{}` for flags
 * that do not depend on one.
 */
export const IFeatureContextToken = new SingleToken<FeatureContext>('IFeatureContext');
