# Epic: Feature flags

- **Status:** Accepted
- **ADR:** [ADR 0021 - Feature flags switch implementations, with a mandatory fallback](../../../../adr/0021-feature-flags-with-mandatory-fallback.md)
- **Public API:** `MultiVariantFeatureToken`, `ToggleFeatureToken`, `FeatureEvaluation`, `FeatureTokenOptions`, `BindableToken.variantOf` / `primaryVariantOf` / `fallbackOf`, `IContainer.hasAlias`, `IFeatureFlags`, `IFeatureFlagsToken`, `FeatureContext`, `IFeatureContextToken`, `FeatureVariant`
- **Executable spec:** `__tests__/specs/feature-flags.spec.ts`

## Intent

As a TypeScript developer, I want a feature flag to choose which
implementation of a dependency is injected, so that consumers depend on one
type, stay unaware of the flag, and a flag can never leave them without an
implementation.

## Stories

### Story: Implementations declare where they belong

As a library user, I declare on each implementation's own token which feature
it serves and in which role, so that the feature token needs to know nothing
about its implementations and each implementation keeps its own identity.

Acceptance criteria:

- `token.variantOf(feature, name)` makes the dependency bound to `token` the
  implementation of the variant `name`; `name` must be one of the feature's
  variant names (checked by the type checker).
- `token.primaryVariantOf(feature)` makes it the primary variant: used while
  the flag is on and no named variant implementation matches.
- `token.fallbackOf(feature)` makes it the fallback.
- Every bindable token (`SingleToken`, `SingleAliasToken`, `GroupAliasToken`)
  supports them; the declarations are kept by `args` / `argsFn` / `lazy` /
  `addTags` and never change the original token.
- An implementation stays resolvable through its own token, keeps its provider
  pipes (e.g. `singleton()`), and can serve several features.

### Story: A multi-variant flag picks one implementation per served variant

As a library user, I can run A/B/n experiments and rollouts the same way.

Acceptance criteria:

- While the flag client's `getVariant` serves an enabled variant with a
  registered implementation, that implementation is injected.
- Otherwise, while the flag is on, the primary variant is injected when one is
  registered.
- Otherwise - the flag is off, nothing served is implemented, or the flag
  client throws - the fallback is injected.

### Story: A flag always has a fallback

As a library user, I cannot resolve a feature without a fallback, so a flag
never leaves a consumer without an implementation by accident.

Acceptance criteria:

- Resolving a feature token with no fallback registered in the resolving scope
  or a parent throws `DependencyNotFoundError` naming the flag, whatever the
  flag serves.

### Story: A toggle is the case with only a primary variant

As a library user, I can declare an on/off flag without naming variants.

Acceptance criteria:

- `ToggleFeatureToken` is a `MultiVariantFeatureToken` with no named variants;
  `variantOf(toggle, ...)` is rejected by the type checker.
- It evaluates with the client's `isEnabled`: the primary variant is injected
  while the flag is on, the fallback otherwise, when the primary variant is not
  registered, or when the client throws.

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
  (`DependencyNotFoundError`), not a silent fallback.
- The flag is evaluated on every resolution; caching is the consumer's choice.
- An Unleash client instance satisfies `IFeatureFlags` structurally.

### Story: Tokens stay tokens

As a library user, I can specialize a feature token like any other token.

Acceptance criteria:

- Runtime args reach the selected implementation; `args` / `argsFn` append
  after them.
- `lazy()` defers both the flag evaluation and the construction to first
  member access.
- Modifiers return new tokens of the same kind and leave the original
  unchanged.

## Notes

- Membership is stored as aliases on the registration
  (`feature:<flag>:variant:<name>`, `feature:<flag>:primary`,
  `feature:<flag>:fallback`), so it follows scope rules like any alias.
  `IContainer.hasAlias` checks one without throwing.
- Two implementations claiming the same role: the first registered wins, as
  with any single-alias lookup.
- Non-goal: evaluating asynchronous clients (OpenFeature server SDK); wrap such
  a client in an adapter which evaluates ahead of time.
- A new flag kind subclasses `MultiVariantFeatureToken` and overrides only
  `evaluate(flags, context)`.
