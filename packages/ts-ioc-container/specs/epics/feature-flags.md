# Epic: Feature flags

- **Status:** Accepted
- **ADR:** [ADR 0021 - Feature flags switch implementations, with a mandatory fallback](../../../../adr/0021-feature-flags-with-mandatory-fallback.md)
- **Public API:** `MultiVariantFeatureToken`, `MultiVariantFeatureTokenContext`, `ToggleFeatureToken`, `ToggleFeatureTokenContext`, `FeatureTokenOptions`, `IFeatureFlags`, `IFeatureFlagsToken`, `FeatureContext`, `IFeatureContextToken`, `FeatureVariant`
- **Executable spec:** `__tests__/specs/feature-flags.spec.ts`

## Intent

As a TypeScript developer, I want a feature flag to choose which
implementation of a dependency is injected, so that consumers depend on one
type, stay unaware of the flag, and a flag can never leave them without an
implementation.

## Stories

### Story: A multi-variant flag picks one implementation per served variant

As a library user, I create the feature token with its fallback and register
one implementation per variant with `@register(Token.variant(name))`, so that
A/B/n experiments and rollouts are declared the same way and the fallback is
the baseline the variants overlay.

Acceptance criteria:

- The implementation registered with `@register(Token.variant(name))` is
  injected while the flag client's `getVariant` serves an enabled variant `name`.
- The fallback is injected when no variant is served, when the served variant
  has no registered implementation, or when the flag client throws.
- The token's variant names can be narrowed by a type parameter.

### Story: The fallback is part of the token

As a library user, I cannot create a feature token without a fallback, so that
"a flag always has a fallback" is enforced by the type checker rather than by
convention.

Acceptance criteria:

- The second constructor argument is a context `{ fallback: Injectable }`,
  and `fallback` is required.
- The fallback may be a class, a key, a token or an `InjectFn`; a key or token
  resolves through its own registration, keeping its provider pipes (e.g.
  `singleton()`).
- The fallback is resolved with the same scope and args as the selected
  variant would be.

### Story: A toggle is the single-variant case

As a library user, I can declare an on/off flag without naming variants, and
it behaves exactly like a multi-variant flag with one variant.

Acceptance criteria:

- `ToggleFeatureToken(flag, { fallback })` is a `MultiVariantFeatureToken`
  whose only variant is `enabled`; `Token.enabled()` is `Token.variant('enabled')`, and other variant
  names are rejected by the type checker.
- It evaluates with the client's `isEnabled`; the enabled implementation is
  injected while the flag is on, the fallback otherwise.
- The fallback is injected when the flag is on but no enabled implementation
  is registered, or when the flag client throws.

### Story: Flags are evaluated per resolution context

As a library user, I provide the flag client and the evaluation context as
ordinary dependencies, so that a request scope evaluates a flag for its own
user.

Acceptance criteria:

- The flag client is resolved from `IFeatureFlagsToken`; the context from
  `IFeatureContextToken`, both from the resolving scope.
- Two request scopes with different contexts can receive different
  implementations from the same feature token.
- A missing flag client or context is a configuration error
  (`DependencyNotFoundError`), not a silent fallback - so a flag is never
  evaluated for the wrong (e.g. anonymous) context by accident.
- The flag is evaluated on every resolution; caching is the consumer's choice.
- An Unleash client instance satisfies `IFeatureFlags` structurally; no
  adapter is needed.

### Story: Tokens stay tokens

As a library user, I can specialize a feature token like any other token.

Acceptance criteria:

- Runtime args reach the selected implementation; `args` / `argsFn` append
  after them.
- `lazy()` defers both the flag evaluation and the construction to first
  member access.
- Modifiers return new tokens of the same kind, with the same fallback, and
  leave the original unchanged.

## Notes

- Non-goal: evaluating asynchronous clients (OpenFeature server SDK). Resolution
  is synchronous; such a client is wrapped in an adapter which evaluates ahead
  of time (e.g. when the request scope is created) and answers synchronously.
- Non-goal: preventing a consumer from injecting a concrete implementation
  class directly; that bypasses the flag on purpose.
- A new flag kind subclasses `MultiVariantFeatureToken` and overrides only
  `evaluate(flags, context)` - how the served variant is determined.
- A singleton consumer holding a flagged dependency keeps the implementation it
  received; inject the feature token lazily or resolve it per request.
