# Archive helpers, used by the `archive` composite action and runnable by hand.
#
# Every target is a function of the variables passed to it — nothing is read
# from the ambient environment — so a command reproduces exactly the same way
# in CI and on a laptop. Paths are workspace-relative, so run from this
# directory.
#
#   make archive FILE=build-output.tar.gz PATHS=$'packages/a/cjm\npackages/b/cjm'
#   make unarchive FILE=build-output.tar.gz
#   make run MODE=archive FILE=... PATHS=...   # validates MODE, then dispatches

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
	@echo "  make run MODE=<archive|unarchive> FILE=<tarball> [PATHS=<paths>]"
	@echo ""
	@echo "Example:"
	@echo "  make archive FILE=build-output.tar.gz \\"
	@echo "    PATHS=\$$'packages/ts-ioc-container/cjm\\npackages/react/cjm'"

# Entry point for the composite action: validates MODE, then runs that target.
run: validate-mode
	@$(MAKE) --no-print-directory $(MODE) FILE="$(FILE)" PATHS="$(paths)"

# A typo'd mode would otherwise fail with make's own "no rule to make target"
# instead of saying which modes exist.
validate-mode:
	@case "$(MODE)" in \
		archive | unarchive) ;; \
		*) \
			echo "::error::archive: unknown mode '$(MODE)' (expected 'archive' or 'unarchive')" >&2; \
			exit 1 \
			;; \
	esac

archive:
	@if [ -z "$(FILE)" ]; then \
		echo "::error::archive: mode 'archive' requires FILE" >&2; \
		exit 1; \
	fi
	@if [ -z "$(paths)" ]; then \
		echo "::error::archive: mode 'archive' requires at least one path" >&2; \
		exit 1; \
	fi
	tar -czf "$(FILE)" -- $(paths)

unarchive:
	@if [ -z "$(FILE)" ]; then \
		echo "::error::archive: mode 'unarchive' requires FILE" >&2; \
		exit 1; \
	fi
	tar -xzf "$(FILE)"
	rm "$(FILE)"
