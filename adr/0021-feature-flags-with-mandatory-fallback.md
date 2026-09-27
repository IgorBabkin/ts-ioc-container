# ADR 0021 — Feature flags switch implementations, with a mandatory fallback

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** core maintainers
- **Tags:** tokens, feature-flags, api-design

## Context

Choosing an implementation by a feature flag is one of the most common reasons
to use a DI container at all: a rollout, a kill switch or an A/B/n test swaps
the implementation behind an interface while consumers stay unaware of the
flag. Without library support every application writes the same delegating
composite by hand.

A design written for Symfony DI (a symmetric `#[FeatureOn]` / `#[FeatureOff]`
pair, grouped and validated by a compiler pass, with lazy proxies reset between
requests, variants postponed) was considered and rejected for this library:

- There is no compile phase to group and validate pairs; every resolution
  already runs through a function the library controls, so a token can choose.
- Scopes already bound the lifetime of a decision: a `request` scope is created
  and disposed per request, so no proxy has to be reset for a decision not to
  outlive its user.
- A symmetric pair treats the fallback as one half that may be missing, which
  then has to be validated. Our methodology is that **a feature flag always has
  a fallback**, so the fallback should be structurally required, not checked.
- Binary is not the general case. Unleash, OpenFeature and most flag services
  model a flag as serving one of several variants; on/off is the one-variant
  special case, and designing for it first makes variants a later bolt-on.

## Decision

**`MultiVariantFeatureToken<T, V>(key, flag)` is a new token shape** (ADR 0009)
and the general case. The fallback is the implementation bound to the token
itself, under the plain key. `token.variant(name)` returns a `SingleToken` on a
derived key (`key@flag:name`) that overlays it. `resolve` asks the flag client
which variant it serves (`getVariant`) and resolves that variant's
implementation when one is registered, the fallback otherwise. A throwing flag
client serves the fallback. `V` narrows the accepted variant names.

**`ToggleFeatureToken<T>` extends it as the on/off case**: its only variant is
`enabled` (`token.enabled()` is `token.variant('enabled')`), and it evaluates
with `isEnabled` instead of `getVariant`. How the served variant is determined
is the one protected method a subclass overrides (`evaluate(flags, context)`);
the fallback, the context, the args cascade and laziness are shared. Modifiers
construct the receiver's own class, so a specialized toggle is still a toggle.

**The flag client and context are ordinary dependencies.** `IFeatureFlagsToken`
and `IFeatureContextToken` are resolved from the resolving scope on every
resolution. A missing client or context is `DependencyNotFoundError`: evaluating
for the wrong (e.g. anonymous) context silently is worse than failing.

**`IFeatureFlags` is vendor-neutral and shaped after Unleash**
(`isEnabled(name, context)`, `getVariant(name, context)`), so an Unleash client
satisfies it structurally and the library keeps zero runtime dependencies
(ADR 0008). Resolution is synchronous; asynchronous clients (OpenFeature server
SDK) are adapted by the application.

The tokens keep the token contract: runtime args cascade (`forwardArgs`),
`args` / `argsFn` / `lazy` / `addTags` return new tokens (ADR 0005), and `lazy()`
defers the flag evaluation itself to first member access.

## Consequences

- A/B/n experiments and rollouts are declared the same way; adding a variant is
  registering one more class.
- Rollout clean-up is deleting a class: after 100% remove the fallback and bind
  the survivor to the token; a kill switch is turning the flag off.
- A variant without an implementation is not an error - the fallback is served.
  That is the intent (a variant may be added remotely before the code ships),
  but a mistyped variant name on the flag service also silently falls back.
- Resolving the plain key, or injecting a concrete class, bypasses the flag.
  Nothing prevents it; flag-aware consumers inject the token.
- A singleton consumer keeps the implementation it received; per-user flags
  belong in request-scoped consumers or behind `token.lazy()`.
