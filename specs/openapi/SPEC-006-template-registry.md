# SPEC-006 · Shared Handlebars registry

Status: **active** · Requirement prefix: `TR`

## Context

Both generators precompile `lib/templates/*.hbs` with the `handlebars` CLI into a package-local
`hbs/index.cjs`, and both import the **main `handlebars` entry point**. There is one Handlebars
instance per process, so there is one `Handlebars.templates` map and one helper namespace, shared by
every package loaded into it. A consumer that generates types and validators — `backend-template`,
and this repository's own integration test — loads both packages at once and renders through that
single registry.

This is not an implementation detail hidden behind a module boundary: it is a namespace two
independently versioned packages write into, and a collision in it is silent. Nothing throws, a
template simply renders with another package's definition.

## Requirements

**TR-1** — A template is registered under the **basename of its `.hbs` file**
(`ServerRoute.hbs`, `ValidationJsonSchema.hbs`), in the process-global `Handlebars.templates`.
Importing a package's `render` module is what registers them, as an import side effect.

**TR-2** — Template basenames are **unique across all packages** in this repository. Two packages
must never ship a template with the same basename: the one loaded second wins and the other
package silently renders the wrong template.

**TR-3** — `renderTemplate(name, data)` looks a template up by that global name and throws
`Template not found: <name>` when it is absent, rather than rendering empty output.

**TR-4** — Helpers are registered into one namespace and the last registration wins, so a helper
name registered by more than one package must mean the same thing in each. The helpers both
packages register today are `array`, `capitalize`, `excludes`, `filter_parameters`, `get_methods`,
`get_methods_obj`, `get_value_by_key`, `has_property`, `includes`, `is_equal`, `render_ref`,
`render_template` and `some_parameters`. A package that needs different behaviour under one of
these names must pick a new name instead.

**TR-5** — Consequently, loading both packages — in either order — does not change what either one
renders. A document rendered by `@ibabkin/openapi-to-zod` alone and by
`@ibabkin/openapi-to-zod` alongside `@ibabkin/openapi-to-server` produces byte-identical output,
and the same holds the other way round.

**TR-6** — `render_template` returns a `Handlebars.SafeString`: generated output is TypeScript, not
HTML, so nested renders must not be entity-escaped.

## Why not one environment per package

`Handlebars.create()` would give each package an isolated environment and make TR-2 and TR-4
unnecessary. It is not used because the precompiled `hbs/index.cjs` bundles emitted by the
`handlebars` CLI register themselves into the main entry's registry; isolating them would mean
compiling templates at runtime, or teaching the build to emit into a named environment. Until then,
the shared namespace is part of the contract between the packages, which is why it is specified
rather than commented.

## Tests

| Requirement | Test |
| --- | --- |
| TR-1, TR-3, TR-6 | `packages/openapi-to-server-interface/__tests__/templateRegistry.spec.ts` |
| TR-2, TR-4, TR-5 | `packages/openapi-express-server/__tests__/templateRegistry.spec.ts` |
