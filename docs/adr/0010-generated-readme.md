# ADR 0010 — Generated README from Handlebars source

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** documentation, readme, generated-files

## Context

The package README is both project documentation and npm landing-page content.
It needs to stay consistent with examples and generated snippets while still
being easy to publish with the package.

Editing generated documentation directly creates drift: source examples,
templates, and final markdown can disagree, and later generation may overwrite
manual changes.

## Decision

Treat `README.md` as generated output. Documentation source lives in
`.readme.hbs.md` and supporting generation scripts. Contributors update the
source template and regenerate the README with `pnpm run generate:docs`.

The repository guidelines explicitly instruct contributors not to edit
generated outputs directly.

> [!IMPORTANT]
> `.readme.hbs.md` is the source of truth. `README.md` is generated output.

> [!WARNING]
> Direct README edits are overwritten by `pnpm run generate:docs`; update the
> template or included examples instead.

## Consequences

**Positive**

- README content can be regenerated consistently.
- Examples and documentation source have a single intended edit path.
- Generated output remains suitable for npm and GitHub display.

**Negative / trade-offs**

- Small README edits require running the generation command.
- Contributors must know which file is source and which file is output.
- The generation script becomes part of the documentation toolchain and needs
  maintenance.

## References

- `.readme.hbs.md`
- `README.md`
- `scripts/generate-readme/`
- `package.json`
- `AGENTS.md`
