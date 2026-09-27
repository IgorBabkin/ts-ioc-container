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

**`MultiVariantFeatureToken<T, V>(flag)` is a new token shape** (ADR 0009) and
the general case. **The implementations decide where they belong**, not the
feature: `BindableToken`, the new base of every token a registration can be
bound to (`SingleToken`, `SingleAliasToken`, `GroupAliasToken`), declares a
membership with

- `variantOf(feature, name)` - the implementation of the variant `name`
  (`name` is checked against `V`);
- `primaryVariantOf(feature)` - the implementation while the flag is on and no
  named variant implementation matches;
- `fallbackOf(feature)` - the fallback.

`bindTo` binds the token's own key or alias and adds one alias per membership
(`feature:<flag>:variant:<name>`, `:primary`, `:fallback`), so membership
follows scope rules like any alias. `resolve` evaluates the flag and resolves,
through the alias, the served variant's implementation, else (while the flag
is on) the primary variant, else the fallback; a throwing client serves the
fallback. `IContainer.hasAlias` answers "is there one?" without throwing.

**A flag always has a fallback.** Resolving a feature without a fallback in the
resolving scope or a parent throws `DependencyNotFoundError` naming the flag,
whatever the flag serves - a misconfiguration surfaces on the first
resolution, not on the day the flag is switched off. (An earlier iteration made
the fallback a required constructor argument; it moved to `fallbackOf` so that
every role is declared the same way, by the implementation.)

**`ToggleFeatureToken<T>(flag)` extends it as the on/off case**: no named
variants (`V = never`), only a primary one, evaluated with `isEnabled` instead
of `getVariant`. How a flag is read is the one protected method a subclass
overrides (`evaluate(flags, context)`, returning `{ enabled, variant? }`).

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
`args` / `argsFn` / `lazy` / `addTags` return new tokens of the same kind with
the same memberships (ADR 0005), and `lazy()` defers the flag evaluation itself
to first member access. `BindableToken` also removes the state and modifier
code the three bindable tokens used to duplicate.

## Consequences

- An implementation keeps its own token: it can be injected directly (tests,
  admin tooling) and can serve several features.
- A/B/n experiments, rollouts and kill switches are declared the same way;
  adding a variant is registering one more class.
- Rollout clean-up is deleting a class: after 100% drop the fallback and the
  feature token, and inject the survivor's own token.
- A variant without an implementation is not an error - the primary variant or
  the fallback is served. That is the intent (a variant may be added remotely
  before the code ships), but a mistyped variant name on the flag service also
  silently falls back.
- Two implementations claiming the same role are not detected: the first
  registered wins.
- Injecting an implementation's own token bypasses the flag - by design.
- A singleton consumer keeps the implementation it received; per-user flags
  belong in request-scoped consumers or behind `token.lazy()`.
