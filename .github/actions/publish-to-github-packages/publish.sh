#!/usr/bin/env bash
set -e

# Publish to GitHub Packages
# Usage: ./publish.sh <repository-owner> <repository> <package-name> <github-token>

REPO_OWNER_INPUT="$1"
REPOSITORY="$2"
PACKAGE_NAME="$3"
GITHUB_TOKEN="$4"

# Get repository owner (npm scopes must be lowercase)
REPO_OWNER=$(echo "${REPO_OWNER_INPUT}" | tr '[:upper:]' '[:lower:]')

# Get current package version
PACKAGE_VERSION=$(node -p "require('./package.json').version")

# Configure npm to check GitHub Packages
echo "@${REPO_OWNER}:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# Check if version already exists in GitHub Packages
if npm view "@${REPO_OWNER}/${PACKAGE_NAME}@${PACKAGE_VERSION}" version --registry=https://npm.pkg.github.com 2>/dev/null; then
  echo "✓ Version ${PACKAGE_VERSION} already published to GitHub Packages, skipping..."
  exit 0
fi

echo "Publishing version ${PACKAGE_VERSION} to GitHub Packages..."

# Temporarily scope the package name for GitHub Packages
# GitHub Packages requires scoped packages matching the repository owner
npm pkg set name="@${REPO_OWNER}/${PACKAGE_NAME}"

# Add repository field to link package to this repository (required for GitHub Packages)
npm pkg set repository.type=git
npm pkg set repository.url="git+https://github.com/${REPOSITORY}.git"

# Publish to GitHub Packages
npm publish --registry=https://npm.pkg.github.com

echo "✓ Successfully published to GitHub Packages"

# Restore original package name
npm pkg set name="${PACKAGE_NAME}"
