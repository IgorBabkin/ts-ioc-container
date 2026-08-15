# Publish to GitHub Packages Action

Composite GitHub Action that publishes an npm package to GitHub Packages registry with automatic version checking.

## Features

- Checks if version already exists before publishing (prevents duplicate publish errors)
- Automatically scopes package name for GitHub Packages
- Configures npm registry and authentication
- Restores original package name after publishing

## Usage in Workflow

```yaml
- name: Publish to GitHub Packages
  uses: ./.github/actions/publish-to-github-packages
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    package-name: ts-ioc-container
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for authentication | Yes | - |
| `package-name` | Package name without scope | Yes | `ts-ioc-container` |

Repository name and owner are read from the `github.repository` / `github.repository_owner` context automatically — no need to pass them in.

## Local Testing

You can test the publish script locally using either the bash script directly or via Make:

### Using bash script

```bash
cd .github/actions/publish-to-github-packages
./publish.sh "igorbabkin" "igorbabkin/ts-ioc-container" "ts-ioc-container" "$GITHUB_TOKEN"
```

### Using Makefile

```bash
cd .github/actions/publish-to-github-packages
make publish REPO_OWNER=igorbabkin REPOSITORY=igorbabkin/ts-ioc-container PACKAGE_NAME=ts-ioc-container GITHUB_TOKEN=$GITHUB_TOKEN
```

Or get help:

```bash
make help
```

## Files

- `action.yml` - GitHub Action definition
- `publish.sh` - Bash script with publish logic
- `Makefile` - Local testing helper
- `README.md` - This file
