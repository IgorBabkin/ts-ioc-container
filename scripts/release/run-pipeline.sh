#!/usr/bin/env bash
# Runs the release-monorepo-semantically pipeline end to end: discover
# releasable packages, bump versions, update internal dependency versions,
# write changelogs, commit + tag + push, publish to npm, and create GitHub
# releases.
#
# Usage:
#   scripts/release/run-pipeline.sh              # real release (CI only)
#   scripts/release/run-pipeline.sh --dry-run     # preview, no mutation
#
# `report` always requires a clean working tree, dry-run or not (see its own
# --dry-run note in the README) — commit or stash local changes first.
set -euo pipefail

DRY_RUN_FLAG=()
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_FLAG=(--dry-run)
fi

run() {
  pnpm exec monorepo-semantic-release "$@" "${DRY_RUN_FLAG[@]}"
}

RELEASE_CONTEXT=$(run report)

run package-json --context "$RELEASE_CONTEXT"
run package-manager --context "$RELEASE_CONTEXT"
run changelog --context "$RELEASE_CONTEXT"
run vcs --context "$RELEASE_CONTEXT"
run package-manager publish --context "$RELEASE_CONTEXT"

# release-notes needs a GitHub token/repository (GH_TOKEN/GITHUB_TOKEN and
# GITHUB_REPOSITORY are set by GitHub Actions); skip it outside that context.
if [[ -n "${GITHUB_TOKEN:-}${GH_TOKEN:-}" ]]; then
  run release-notes --context "$RELEASE_CONTEXT"
fi
