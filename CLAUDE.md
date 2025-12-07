# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript IoC (Inversion of Control) container library providing dependency injection with type safety, scoping, lifecycle hooks, and multiple injection strategies. Zero runtime dependencies (except `reflect-metadata`).

### Package Manager

This project uses **pnpm** for package management with workspaces:
- Root project: TypeScript IoC container library
- Workspace: `docs/` (Astro documentation site)

Install pnpm if not already installed:
```bash
npm install -g pnpm
# or
corepack enable
```

## Common Commands

### Development
```bash
pnpm test                 # Run tests with Jest
pnpm run test:coverage    # Run tests with coverage report
pnpm run type-check       # TypeScript type checking (no emit)
pnpm run lint             # Lint lib/, __tests__/, and scripts/
pnpm run lint:fix         # Auto-fix linting issues
pnpm run format           # Format all TypeScript files with Prettier
```

### Building
```bash
pnpm run build            # Build all formats (CommonJS, ESM, types)
pnpm run build:cjm        # Build CommonJS output to cjm/
pnpm run build:esm        # Build ES Modules output to esm/
pnpm run build:types      # Generate TypeScript declarations to typings/
```

### Single Test
```bash
pnpm exec jest __tests__/path/to/test.spec.ts     # Run specific test file
pnpm exec jest -t "test name pattern"              # Run tests matching pattern
```

### Documentation
```bash
pnpm run generate:docs    # Generate README.md from .readme.hbs.md
pnpm run docs:dev         # Start documentation dev server (workspace)
pnpm run docs:build       # Build documentation site (workspace)
pnpm run docs:preview     # Preview built documentation site
```

### Release
```bash
pnpm run release          # Build, test, and publish to npm
```

### Workspace Management
```bash
pnpm install                                      # Install all dependencies (root + workspaces)
pnpm --filter ts-ioc-container-docs <command>    # Run command in docs workspace
pnpm --filter ts-ioc-container-docs add <pkg>    # Add package to docs workspace
```

## Architecture Overview

### Core Concepts (Linked List Architecture)

The Container is structured as a **linked list** with parent references:
- **Container**: Linked list node containing scopes, registrations, providers, and instances
- Each container has a "parent" reference (like "previous" in a linked list)
- Scopes are created as child containers linked to their parent

### Four Main Components

1. **Container** (`lib/container/Container.ts`)
   - Main IoC container managing registrations and resolutions
   - Linked list structure: each container holds a reference to its parent
   - Contains: scopes (child containers), registrations, providers, instances
   - Supports tagged scopes for isolation (e.g., request-level, feature-level)
   - Resolution cascades up the parent chain if not found in current scope

2. **Registration** (`lib/registration/Registration.ts`)
   - Provider factory that registers providers in the container
   - Contains: Provider instance, binding key, scope rules (which scopes to apply to)
   - Determines when and where a provider should be available
   - Uses decorators like `@register`, `bindTo`, `scope` for configuration

3. **Provider** (`lib/provider/Provider.ts`)
   - Factory function that creates/returns dependency instances
   - Handles instance creation and caching strategies (singleton, transient, etc.)
   - Three creation methods: `fromClass`, `fromValue`, `fromKey`
   - Supports transformations via `pipe` method (singleton, args, lazy, decorators)

4. **Injector** (`lib/injector/`)
   - Defines how dependencies are injected into constructors
   - Three types:
     - **MetadataInjector**: Uses `@inject` decorator and `reflect-metadata`
     - **SimpleInjector**: Passes container as first parameter
     - **ProxyInjector**: Injects dependencies as dictionary `Record<string, unknown>`

### Token System

Tokens identify and resolve dependencies:
- **SingleToken**: Resolves single dependency by key
- **SingleAliasToken**: Resolves single dependency by alias
- **GroupAliasToken**: Resolves multiple dependencies by alias
- **GroupInstanceToken**: Resolves instances by predicate
- **ClassToken**: Direct class resolution
- **FunctionToken**: Resolution via function
- **ConstantToken**: Constant value token

### Hooks System

Lifecycle hooks for dependency management:
- **@onConstruct**: Executed after instance construction (requires `AddOnConstructHookModule`)
- **@onDispose**: Executed on container disposal (requires `AddOnDisposeHookModule`)
- **@hook**: Generic hook decorator for custom lifecycle events
- **injectProp**: Property injection helper

## Code Style & Conventions

- Use TypeScript with strict typing
- Follow existing patterns in the codebase
- Use decorators for metadata injection (`@inject`, `@onConstruct`, `@onDispose`)
- Prefer explicit types over `any` (use `any` only when necessary, with warnings)
- Use interfaces for contracts (e.g., `IContainer`, `IProvider`, `IInjector`)
- Follow the existing error handling patterns with custom error classes
- All public APIs should be exported from `lib/index.ts`
- Keep bundle size minimal
- Maintain backward compatibility when possible

## Important File Conventions

### Source Files
- **NEVER edit generated files**: `cjm/`, `esm/`, `typings/` are build outputs
- **Edit source only**: All code changes go in `lib/` directory
- **Tests mirror source**: `__tests__/` structure mirrors `lib/` structure

### Documentation
- **Source**: `.readme.hbs.md` (Handlebars template) - **EDIT THIS**
- **Generated**: `README.md` - **DO NOT EDIT DIRECTLY**
- Run `npm run generate:docs` to regenerate README.md from template

### Build Targets
- `cjm/` - CommonJS for Node.js (via `tsconfig.production.json`)
- `esm/` - ES Modules (via `tsconfig.production.json`)
- `typings/` - TypeScript declaration files

## Code Patterns

### Resolution Flow
```
Container.resolve(key)
  ↓
Check local providers map
  ↓
Found? → Check access rules → Provider.resolve()
  ↓
Not found? → Cascade to parent.resolve(key)
  ↓
No parent? → Throw DependencyNotFoundError
```

### Scope Creation Flow
```
Container.createScope({ tags: [...] })
  ↓
Clone matching providers (based on scope rules)
  ↓
Create new Container with parent reference
  ↓
New scope inherits access to parent dependencies
```

### Registration with Decorators
```typescript
@register(
  bindTo('key'),           // Binding key
  scope((s) => s.hasTag('root')),  // Scope rule
  singleton(),             // Provider transformer
  scopeAccess(...)         // Access control
)
class MyClass { }
```

## Key Implementation Details

### Provider Pipe System
Providers support transformation via `pipe` method:
- Accepts `MapFn<IProvider<T>>` or `ProviderPipe<T>`
- Chains transformations: `Provider.fromClass(X).pipe(singleton(), args('value'))`
- Common pipes: `singleton()`, `args()`, `argsFn()`, `lazy()`, `decorate()`, `scopeAccess()`

### Scope Access Rules
Two types of rules:
1. **ScopeMatchRule**: Determines if provider should exist in scope (registration-level)
2. **ScopeAccessRule**: Controls visibility when resolving (provider-level)

### Metadata System
Uses `reflect-metadata` for decorator information:
- `setClassMetadata` / `getClassMetadata`: Class-level metadata
- `setParameterMetadata` / `getParameterMetadata`: Constructor parameter metadata
- `setMethodMetadata` / `getMethodMetadata`: Method metadata
- Required for `@inject`, `@onConstruct`, `@onDispose` decorators

### Test Scope Conventions
Use consistent scope names in tests:
- **Backend**: application, request, transaction
- **Frontend**: application, page, widget

## TypeScript Configuration

Key compiler options:
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "strict": true,
  "target": "ES2024",
  "module": "ESNext"
}
```

## Error Handling

Custom error classes in `lib/errors/`:
- `DependencyNotFoundError`: Dependency not found in container chain
- `DependencyMissingKeyError`: Registration without binding key
- `ContainerDisposedError`: Operation on disposed container
- `MethodNotImplementedError`: Abstract method not implemented
- `UnexpectedHookResultError`: Hook returned unexpected result
- `UnsupportedTokenTypeError`: Token type not supported

## Testing

- All code must have corresponding tests in `__tests__/`
- Tests use Jest with `ts-jest`
- Test files mirror the source structure
- Use `moq.ts` for mocking when needed
- Maintain high test coverage
- Use consistent test scope legends (see Test Scope Conventions above)

## Project Structure

- `lib/` - Source TypeScript code (main development directory)
- `__tests__/` - Test files using Jest (mirrors lib/ structure)
- `cjm/` - Compiled CommonJS output (generated, do not edit)
- `esm/` - Compiled ES Module output (generated, do not edit)
- `typings/` - TypeScript declaration files (generated, do not edit)
- `docs/` - Astro-based documentation site (separate pnpm workspace)
- `scripts/` - Build and maintenance scripts
- `.readme.hbs.md` - README template source (edit this, not README.md)
- `README.md` - Generated from .readme.hbs.md (do not edit directly)
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `pnpm-lock.yaml` - pnpm lock file

## Development Workflow

1. Make changes in `lib/`
2. Add/update tests in `__tests__/`
3. Run `pnpm test` to verify
4. Run `pnpm run type-check` for type safety
5. Run `pnpm run lint:fix` to fix linting issues
6. Run `pnpm run build` to generate outputs
7. If changing API, update `.readme.hbs.md` and run `pnpm run generate:docs`
8. Commit follows conventional commits (use `pnpm run commit` for help)

## Commit Message Conventions

This project follows conventional commits with specific scope rules:

### Documentation Commits
- **ALWAYS use** `docs(pages):` for documentation site changes (files in `docs/src/pages/`)
- **NEVER use** `fix(docs):` or `feat(docs):` for documentation changes
- The `docs` scope is reserved for documentation infrastructure, not content

**Examples:**
- ✅ `docs(pages): migrate all pages from Astro to MDX`
- ✅ `docs(pages): add new token usage examples`
- ✅ `docs(pages): fix typo in provider documentation`
- ❌ `fix(docs): update container examples` (incorrect - use `docs(pages)`)
- ❌ `feat(docs): add metadata page` (incorrect - use `docs(pages)`)

### CI Performance Commits
- **ALWAYS use** `ci(perf):` for CI/CD performance improvements (NOT `perf(ci):`)
- This prevents triggering unnecessary package releases via semantic-release
- The `ci` scope indicates the change location, `perf` type might trigger releases

**Examples:**
- ✅ `ci(perf): remove Jest cache to speed up workflow`
- ✅ `ci(perf): parallelize test execution`
- ✅ `ci(perf): reduce build matrix combinations`
- ❌ `perf(ci): remove Jest cache` (incorrect - may trigger release)
- ❌ `perf(github): speed up CI` (incorrect - use `ci(perf):`)

### Other Common Scopes
- `feat(container):` - New container features
- `fix(provider):` - Provider bug fixes
- `test(hooks):` - Test updates for hooks
- `chore(release):` - Release automation
- `ci(github):` - CI/CD changes

## Notes on Docs Directory

- `docs/` is a separate pnpm workspace (Astro project) with its own package.json
- Managed via pnpm workspace in `pnpm-workspace.yaml`
- Root ESLint ignores `docs/**` (docs has its own Astro-specific config)
- Documentation site has separate lint-staged rules for Astro files
- Use `pnpm --filter ts-ioc-container-docs <command>` to run commands in docs workspace
- Docs dependencies are isolated from root project dependencies