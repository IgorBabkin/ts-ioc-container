# SPEC-005 · URL construction and path parameters

Status: **active** · Requirement prefix: `URL`

## Context

The generated client and the Express server both start from the same string — the path key in the
OpenAPI document, e.g. `/users/{id}/posts/{postId}` — and take it in opposite directions. The
client fills the placeholders in to produce a URL; the server rewrites them into an Express pattern
that matches that URL. If the two derivations disagree the client calls an endpoint the server
never registered, and the failure is a 404 with nothing in it to point at the cause.

| Direction | Produced by | Result |
| --- | --- | --- |
| Client | `createUrl` (`@ibabkin/openapi-to-server`), called by `ApiClient` | `/users/42/posts/7?expand=author` |
| Server | `convertOpenAPIPathToExpress` (`@ibabkin/openapi-express-server`) | `/users/:id/posts/:postId` |

## Requirements

**URL-1** — A path parameter is written `{name}` in the OpenAPI path, and `name` matches the `name`
of a path parameter of the operation ([RP-3](./SPEC-003-request-payload.md)). The generated client
embeds the path **verbatim** — placeholders and all — and substitutes at call time; it does not
pre-render a URL at generation time.

**URL-2** — `createUrl(pattern, payload)` is `addQueryParams(addPathParams(pattern, payload.params),
payload.query)`, and both halves tolerate a missing member. `payload.body` is never part of the
URL.

**URL-3** — `addPathParams` replaces `{name}` with `encodeURIComponent(value)` for each entry of
`params`. A value of `null` or `undefined` is skipped, which leaves the `{name}` placeholder in the
URL rather than producing `/users/undefined`.

**URL-4** — `addQueryParams` appends `?` and `&`-joined `encodeURIComponent(key)=encodeURIComponent(value)`
pairs, skipping `null` and `undefined` values, and returns the URL untouched when nothing is left
to append (no trailing `?`).

**URL-5** — `convertOpenAPIPathToExpress` replaces every `{name}` with `:name` and changes nothing
else.

**URL-6** — The two agree: for any OpenAPI path and any complete set of path parameters, the URL
`createUrl` produces is matched by the Express route registered from
`convertOpenAPIPathToExpress` of the same path, and Express parses back the values that were
substituted. This is the round trip a generated client and a generated server perform against each
other.

## Encoding table

| Pattern | `params` | `query` | URL |
| --- | --- | --- | --- |
| `/items` | — | — | `/items` |
| `/items` | — | `{ q: 'x&y', limit: 10 }` | `/items?q=x%26y&limit=10` |
| `/users/{id}` | `{ id: 'a b' }` | — | `/users/a%20b` |
| `/users/{id}` | `{ id: undefined }` | — | `/users/{id}` |
| `/users/{id}` | `{ id: 1 }` | `{ expand: undefined }` | `/users/1` |

## Out of scope

`style` and `explode` on parameters (`form`, `deepObject`, comma-joined arrays …). `createUrl`
serialises every value with `String(value)` through `encodeURIComponent`, so array and object
parameters are not supported by the generated client.

## Tests

| Requirement | Test |
| --- | --- |
| URL-2, URL-3, URL-4 | `packages/openapi-to-server-interface/__tests__/query.spec.ts` |
| URL-1 | `packages/openapi-express-server/__tests__/urlRoundTrip.spec.ts` |
| URL-5 | `packages/openapi-express-server/__tests__/utils.spec.ts` |
| URL-6 | `packages/openapi-express-server/__tests__/urlRoundTrip.spec.ts` |
