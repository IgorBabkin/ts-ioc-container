# Implementation of the `archive` composite action.
#
# `action.yml` hands its inputs straight to `make run`; the recipes below are
# the whole implementation, so they can also be run by hand from the repository
# root to reproduce exactly what CI does. Paths are workspace-relative, so run
# them from the workspace root, not from this directory.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c

THIS_MAKEFILE := $(lastword $(MAKEFILE_LIST))

# Supplied on the command line or through the environment (which is how the
# action passes them). Exported so the recipes read them as shell variables —
# `PATHS` is newline-separated, and going through the environment keeps those
# newlines out of the recipe text itself.
MODE ?=
FILE ?=
PATHS ?=
export MODE
export FILE
export PATHS

.DEFAULT_GOAL := help
.PHONY: help run validate-mode archive unarchive

help:
	@echo "Usage:"
	@echo "  make -f .github/actions/archive/Makefile archive FILE=<tarball> PATHS=<newline-separated paths>"
	@echo "  make -f .github/actions/archive/Makefile unarchive FILE=<tarball>"
	@echo "  make -f .github/actions/archive/Makefile run MODE=<archive|unarchive> ..."
	@echo ""
	@echo "Example:"
	@echo "  make -f .github/actions/archive/Makefile archive FILE=build-output.tar.gz \\"
	@echo "    PATHS=\$$'packages/ts-ioc-container/cjm\\npackages/react/cjm'"
	@echo "  make -f .github/actions/archive/Makefile unarchive FILE=build-output.tar.gz"

# Entry point used by action.yml: validates MODE, then runs that target.
run: validate-mode
	@$(MAKE) --no-print-directory -f $(THIS_MAKEFILE) "$${MODE}"

# A typo'd mode would otherwise match no target and fail with make's own
# "no rule to make target" instead of saying what the valid modes are.
validate-mode:
	@case "$${MODE}" in \
		archive | unarchive) ;; \
		*) \
			echo "::error::archive: unknown mode '$${MODE}' (expected 'archive' or 'unarchive')" >&2; \
			exit 1 \
			;; \
	esac

archive:
	@if [ -z "$${FILE}" ]; then \
		echo "::error::archive: mode 'archive' requires FILE" >&2; \
		exit 1; \
	fi
	@mapfile -t entries < <(printf '%s\n' "$${PATHS}" | sed '/^[[:space:]]*$$/d'); \
	if [ "$${#entries[@]}" -eq 0 ]; then \
		echo "::error::archive: mode 'archive' requires at least one path" >&2; \
		exit 1; \
	fi; \
	tar -czf "$${FILE}" -- "$${entries[@]}"

unarchive:
	@if [ -z "$${FILE}" ]; then \
		echo "::error::archive: mode 'unarchive' requires FILE" >&2; \
		exit 1; \
	fi
	@tar -xzf "$${FILE}"
	@rm "$${FILE}"
