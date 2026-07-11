## Description

<!-- Summarize what this PR changes and why. Link any related issues (e.g. Closes #123). -->

## Type of change

<!-- Check the type that matches your commit scope (see Commit Message Conventions in CLAUDE.md). -->

- [ ] `feat` — new feature (minor release)
- [ ] `fix` / `perf` — bug fix or performance improvement (patch release)
- [ ] `BREAKING CHANGE` — incompatible API change (major release)
- [ ] `docs` / `test` / `ci` / `chore` / `refactor` / `style` — no package release

## Checklist

- [ ] Source edited only under `lib/` (not `cjm/`, `esm/`, or `typings/`)
- [ ] `README.md` regenerated via `pnpm run generate:docs` if `.readme.hbs.md` changed
- [ ] Tests added or updated under `__tests__/` to cover the change
- [ ] `pnpm run lint` passes
- [ ] `pnpm run type-check` passes
- [ ] `pnpm test` passes
- [ ] Commit messages follow Conventional Commits with the correct release/non-release scope

## Additional notes

<!-- Anything reviewers should know: trade-offs, follow-ups, or areas needing extra attention. -->
