# Archive scripts, used by the `archive` composite action and runnable by hand.
#
# Each target is a function of the variables passed to it — nothing is read
# from the ambient environment — so a command reproduces exactly the same way
# in CI and on a laptop. Paths are workspace-relative, so run from this
# directory.
#
#   make archive FILE=build-output.tar.gz PATHS=$'packages/a/cjm\npackages/b/cjm'
#   make unarchive FILE=build-output.tar.gz

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c

# PATHS arrives newline-separated (an action's YAML block scalar). `strip`
# collapses every whitespace run to a single space, which both drops blank
# lines and flattens the value to one line — a multi-line value expanded into
# a recipe would otherwise be split into separate shell commands mid-quote.
# Consequently paths must not contain spaces or glob characters.
paths = $(strip $(PATHS))

help:
	@echo "Usage:"
	@echo "  make archive FILE=<tarball> PATHS=<newline-separated paths>"
	@echo "  make unarchive FILE=<tarball>"
	@echo ""
	@echo "Example:"
	@echo "  make archive FILE=build-output.tar.gz \\"
	@echo "    PATHS=\$$'packages/ts-ioc-container/cjm\\npackages/react/cjm'"

archive:
	@if [ -z "$(FILE)" ]; then \
		echo "::error::archive: FILE is required" >&2; \
		exit 1; \
	fi
	@if [ -z "$(paths)" ]; then \
		echo "::error::archive: PATHS must list at least one path" >&2; \
		exit 1; \
	fi
	tar -czf "$(FILE)" -- $(paths)

unarchive:
	@if [ -z "$(FILE)" ]; then \
		echo "::error::unarchive: FILE is required" >&2; \
		exit 1; \
	fi
	tar -xzf "$(FILE)"
	rm "$(FILE)"
