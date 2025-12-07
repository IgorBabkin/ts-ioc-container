.PHONY: help publish

help:
	@echo "Usage:"
	@echo "  make publish REPO_OWNER=<owner> REPOSITORY=<repo> PACKAGE_NAME=<name> GITHUB_TOKEN=<token>"
	@echo ""
	@echo "Example:"
	@echo "  make publish REPO_OWNER=igorbabkin REPOSITORY=igorbabkin/ts-ioc-container PACKAGE_NAME=ts-ioc-container GITHUB_TOKEN=\$$GITHUB_TOKEN"

publish:
	@if [ -z "$(REPO_OWNER)" ] || [ -z "$(REPOSITORY)" ] || [ -z "$(PACKAGE_NAME)" ] || [ -z "$(GITHUB_TOKEN)" ]; then \
		echo "Error: Missing required variables"; \
		echo ""; \
		make help; \
		exit 1; \
	fi
	./publish.sh "$(REPO_OWNER)" "$(REPOSITORY)" "$(PACKAGE_NAME)" "$(GITHUB_TOKEN)"
