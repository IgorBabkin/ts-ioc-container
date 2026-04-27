# Epic: Token-based injection

- **Status:** Accepted
- **ADR:** [ADR 0009 - Token taxonomy](../../docs/adr/0009-token-taxonomy.md)
- **Public API:** `InjectionToken`, `SingleToken`, `ClassToken`, `FunctionToken`, `ConstantToken`, `SingleAliasToken`, `GroupAliasToken`, `GroupInstanceToken`, `toToken`, `toSingleAlias`, `toGroupAlias`, `select`
- **Executable spec:** `__tests__/specs/token-based-injection.spec.ts`

## Intent

As a TypeScript developer, I want dependency requests to be explicit and
composable so that call sites can describe whether they expect one value, many
values, a class instance, a computed value, or existing instances.

## Stories

### Story: Resolve by token shape

As a library user, I can choose the token shape that matches the dependency I
need so that resolution intent is clear at the injection site.

Acceptance criteria:

- A single token resolves one dependency by key.
- A class token resolves a constructor through the container injector.
- A function token runs a custom resolver with the container and options.
- A constant token returns its literal value.
- A single alias token resolves the first provider bound to an alias.
- A group alias token resolves all visible providers bound to an alias.
- An instance token filters tracked instances by predicate.

### Story: Compose token arguments

As a library user, I can add static or dynamic arguments to a token so that a
shared token can be specialized for one injection site.

Acceptance criteria:

- `args` appends static arguments to the token's resolution.
- `argsFn` appends arguments computed from the resolving container.
- Chained argument modifiers preserve earlier arguments in order.
- The original token remains unchanged after a modifier is called.

### Story: Configure lazy token resolution

As an application developer, I can mark a token resolution as lazy so that class
instances behind that token are constructed only when used.

Acceptance criteria:

- A lazy token passes lazy resolution intent to the container.
- Lazy token configuration returns a new token instance.
- Tokens that cannot support lazy configuration fail clearly.

### Story: Select derived values

As a library user, I can use token selection helpers so that injected values can
be mapped into the shape a consumer needs.

Acceptance criteria:

- A token `select` function maps the resolved value.
- An alias-group select maps every resolved alias value.
- `select.scope.current` resolves the current scope.
- `select.scope.create` creates a child scope from the current scope.

### Story: Convert user input to tokens

As a library author, I can normalize supported token inputs so that public APIs
can accept keys, constructors, resolver functions, or existing tokens.

Acceptance criteria:

- `toToken` returns existing injection tokens unchanged.
- `toToken` converts strings and symbols to single tokens.
- `toToken` converts constructors to class tokens.
- `toToken` converts resolver functions to function tokens.
- Unsupported token input fails with `UnsupportedTokenTypeError`.

## Notes

Token modifier methods are intentionally immutable. Specs should preserve this
as a product contract because tokens are commonly shared constants.
