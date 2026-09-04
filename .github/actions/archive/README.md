# Archive Action

Composite GitHub Action that packs workspace paths into a tarball, or unpacks
one back over the workspace and deletes it.

Used by [`build-artifacts`](../build-artifacts/action.yml) so that
`actions/upload-artifact` only ever sees a single file: the artifact then has
no least-common-ancestor to compute, and the paths stored inside the tarball
are the only thing deciding where the output lands on download.

The work lives in the repository's root [`Makefile`](../../../Makefile) as an
`archive` and an `unarchive` target. This action validates `mode`, then calls
the matching target with its inputs as arguments.

## Usage in Workflow

```yaml
- name: Archive build output
  uses: ./.github/actions/archive
  with:
    mode: archive
    file: build-output.tar.gz
    paths: |
      packages/ts-ioc-container/cjm
      packages/react/cjm

- name: Unarchive build output
  uses: ./.github/actions/archive
  with:
    mode: unarchive
    file: build-output.tar.gz
```

## Inputs

| Input   | Description                                                                   | Required | Default |
| ------- | ----------------------------------------------------------------------------- | -------- | ------- |
| `mode`  | `archive` to pack `paths` into `file`, `unarchive` to extract it and delete it | Yes      | -       |
| `file`  | Tarball to write or read                                                      | Yes      | -       |
| `paths` | Newline-separated workspace-relative paths to pack (mode `archive` only)       | No       | `''`    |

An unknown `mode` fails the step with a `::error::` annotation rather than
silently matching nothing. Paths must not contain spaces or glob characters.

## Local Testing

The action is a thin wrapper around the root Makefile, so the same logic runs
locally. Paths are workspace-relative — run from the repository root:

```bash
make archive FILE=build-output.tar.gz \
  PATHS=$'packages/ts-ioc-container/cjm\npackages/react/cjm'

make unarchive FILE=build-output.tar.gz
```

Get help (also the default target):

```bash
make help
```

## Files

- `action.yml` - GitHub Action definition
- [`../../../Makefile`](../../../Makefile) - the `archive` and `unarchive` scripts
- `README.md` - This file
