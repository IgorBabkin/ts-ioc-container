# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript IoC (Inversion of Control) container library providing dependency injection with type safety, scoping, lifecycle hooks, and multiple injection strategies. Zero runtime dependencies (except `reflect-metadata`).

### Package Manager

This project uses **pnpm** for package management with workspaces:
- Root: Workspace orchestrator (private, not published)
- `packages/ts-ioc-container/`: TypeScript IoC container library (published to npm)
- `docs/`: Astro documentation site

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
pnpm --filter ts-ioc-container exec jest __tests__/path/to/test.spec.ts     # Run specific test file
pnpm --filter ts-ioc-container exec jest -t "test name pattern"              # Run tests matching pattern
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
pnpm --filter ts-ioc-container <command>         # Run command in library workspace
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

1. **Container** (`packages/ts-ioc-container/lib/container/Container.ts`)
   - **Goal**: Manage the lifecycle of dependencies, resolve them when requested, and maintain scoped instances
   - Main IoC container managing registrations and resolutions
   - Linked list structure: each container holds a reference to its parent
   - Contains: scopes (child containers), registrations, providers, instances
   - Supports tagged scopes for isolation (e.g., request-level, feature-level)
   - Resolution cascades up the parent chain if not found in current scope

2. **Registration** (`packages/ts-ioc-container/lib/registration/Registration.ts`)
   - **Goal**: Create a provider and register it in a certain scope
   - Provider factory that registers providers in the container
   - Contains: Provider instance, binding key, scope rules (which scopes to apply to)
   - Determines when and where a provider should be available
   - Uses decorators like `@register`, `bindTo`, `scope` for configuration

3. **Provider** (`packages/ts-ioc-container/lib/provider/Provider.ts`)
   - **Goal**: Create a dependency (instance)
   - Factory function that creates/returns dependency instances
   - Handles instance creation and caching strategies (singleton, transient, etc.)
   - Three creation methods: `fromClass`, `fromValue`, `fromKey`
   - Supports transformations via `pipe` method (singleton, args, lazy, decorators)

4. **Injector** (`packages/ts-ioc-container/lib/injector/`)
   - **Goal**: Inject dependencies into constructor
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
- All public APIs should be exported from `packages/ts-ioc-container/lib/index.ts`
- Keep bundle size minimal
- Maintain backward compatibility when possible

### Token Usage Rule

**Always use `SingleToken` (or other typed tokens) instead of raw strings for dependency keys.** Raw string keys are error-prone (typos, no type safety, no IDE autocomplete). `SingleToken` is the default and recommended way to define and resolve dependencies.

**Correct — use `SingleToken`:**
```typescript
// Define typed tokens
const ILoggerToken = new SingleToken<ILogger>('ILogger');
const IUserRepoToken = new SingleToken<IUserRepository>('IUserRepository');

// Register with token
container.addRegistration(R.fromClass(Logger).bindTo(ILoggerToken));

// Inject with token
class AuthService {
  constructor(@inject(ILoggerToken) private logger: ILogger) {}
}

// Resolve with token
const logger = ILoggerToken.resolve(container);
```

**Incorrect — do not use raw strings:**
```typescript
// ❌ Raw string in @inject — no type safety, typos fail at runtime
class AuthService {
  constructor(@inject('ILogger') private logger: ILogger) {}
}

// ❌ Raw string in resolve — no autocomplete, no compile-time check
const logger = container.resolve('ILogger');

// ❌ Raw string in bindToKey — disconnected from injection site
R.fromClass(Logger).bindToKey('ILogger');
```

**When to use other token types instead of `SingleToken`:**
- `SingleAliasToken` — multiple implementations of the same interface, resolve one
- `GroupAliasToken` — multiple implementations, resolve all as an array
- `ClassToken` — direct class resolution (auto-created by `toToken()` for classes)

## Important File Conventions

### Source Files
- **NEVER edit generated files**: `cjm/`, `esm/`, `typings/` are build outputs
- **Edit source only**: All code changes go in `packages/ts-ioc-container/lib/` directory
- **Tests mirror source**: `packages/ts-ioc-container/__tests__/` structure mirrors `lib/` structure

### Documentation
- **Source**: `packages/ts-ioc-container/.readme.hbs.md` (Handlebars template) - **EDIT THIS**
- **Generated**: `packages/ts-ioc-container/README.md` - **DO NOT EDIT DIRECTLY**
- Run `pnpm run generate:docs` to regenerate README.md from template

### Build Targets (inside `packages/ts-ioc-container/`)
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

The pipe system provides composable transformations for both Providers and Registrations.

#### ProviderPipe vs registerPipe

**ProviderPipe** (`packages/ts-ioc-container/lib/provider/ProviderPipe.ts`) is an interface with two transformation methods:
```typescript
export interface ProviderPipe<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;    // Transforms a Provider
  mapRegistration(r: IRegistration<T>): IRegistration<T>;  // Transforms a Registration
}
```

**registerPipe** is a helper factory function that creates ProviderPipe objects:
```typescript
export const registerPipe = <T>(
  mapProvider: (p: IProvider<T>) => IProvider<T>
): ProviderPipe<T> => ({
  mapProvider,
  mapRegistration: (r) => r.pipe(mapProvider),
});
```

**Key Insight:** All exported pipe functions (`singleton()`, `lazy()`, etc.) use `registerPipe()` internally to create ProviderPipe objects. This allows them to work seamlessly with both:
- **Provider.pipe()** - Uses `mapProvider` to transform the provider
- **Registration.pipe()** and **@register()** - Uses `mapRegistration` to transform the registration

#### Available Pipes

| Pipe Name           | ProviderPipe | RegisterPipe | Purpose                                         | File                                                          |
| ------------------- | :----------: | :----------: | ----------------------------------------------- | ------------------------------------------------------------- |
| `singleton()`       |      ✅       |      ✅       | Caches single instance per scope                | `packages/ts-ioc-container/lib/provider/SingletonProvider.ts` |
| `args(...values)`   |      ✅       |      ✅       | Injects static arguments into constructor       | `packages/ts-ioc-container/lib/provider/IProvider.ts`         |
| `argsFn(fn)`        |      ✅       |      ✅       | Injects dynamically resolved arguments          | `packages/ts-ioc-container/lib/provider/IProvider.ts`         |
| `lazy()`            |      ✅       |      ✅       | Defers instantiation until first access         | `packages/ts-ioc-container/lib/provider/IProvider.ts`         |
| `scopeAccess(rule)` |      ✅       |      ✅       | Controls visibility based on scope rules        | `packages/ts-ioc-container/lib/provider/IProvider.ts`         |
| `decorate(fn)`      |      ✅       |      ✅       | Wraps instance with decorator function          | `packages/ts-ioc-container/lib/provider/DecoratorProvider.ts` |
| `scope(...rules)`   |      ❌       |      ✅       | Determines which scopes registration applies to | `packages/ts-ioc-container/lib/registration/IRegistration.ts` |
| `bindTo(...tokens)` |      ❌       |      ✅       | Binds registration to dependency keys           | `packages/ts-ioc-container/lib/registration/IRegistration.ts` |

**Legend:**
- ✅ **ProviderPipe**: Can be used in `.pipe()` on IProvider and IRegistration
- ✅ **RegisterPipe**: Can be used in `@register()` decorator and `.pipe()` on IRegistration
- ❌ Not a ProviderPipe (registration-only)

**Note:** `scope()` and `bindTo()` are `MapFn<IRegistration>` functions, not ProviderPipes. They only work at the registration level, not the provider level.

#### Usage Examples

**1. Using pipes with @register decorator:**
```typescript
@register(
  bindTo('IPasswordHasher'),  // RegisterPipe (registration-only)
  singleton(),                // ProviderPipe (works everywhere)
  scopeAccess(...)           // ProviderPipe (works everywhere)
)
class PasswordHasher { }
```

**2. Using pipes with Provider.pipe():**
```typescript
const container = new Container().addRegistration(
  R.fromClass(EmailService)
    .bindToKey('EmailService')
    .pipe(
      singleton(),           // ProviderPipe
      lazy(),               // ProviderPipe
      args('config.json')   // ProviderPipe
    )
);
```

**3. Using pipes with Registration.pipe():**
```typescript
const container = new Container().addRegistration(
  R.fromClass(ConfigService)
    .pipe(
      bindTo('Config'),                    // Registration pipe
      scope((c) => c.hasTag('application')),  // Registration pipe
      singleton()                          // Provider pipe (converted automatically)
    )
);
```

**4. Chaining multiple pipes:**
```typescript
Provider.fromClass(Service)
  .pipe(
    (p) => p.setArgs(() => ['arg1', 'arg2']),  // Raw function
    lazy(),                                      // ProviderPipe
    singleton()                                  // ProviderPipe
  )
```

#### Pipe Order

**In most cases, pipe order does not matter.** The container is designed so that pipes like `singleton()`, `lazy()`, `args()`, `argsFn()`, and `scopeAccess()` can be applied in any order and will work correctly.

**Exception: `decorate()` pipe** - The `decorate()` pipe order matters because it wraps the instance after creation. If you need to decorate, apply `decorate()` before `lazy()` if you want the decorator to wrap the actual instance, or after `lazy()` if you want to decorate the lazy proxy.

```typescript
// Order doesn't matter for these pipes
.pipe(singleton(), lazy(), args('value'))     // ✅ Works
.pipe(args('value'), singleton(), lazy())     // ✅ Also works

// decorate() order matters
.pipe(decorate(withLogging), lazy())  // Decorates the real instance
.pipe(lazy(), decorate(withLogging))  // Decorates the lazy proxy
```

#### Pipe Processing Details

**IProvider.pipe() accepts:**
- Raw functions: `(p) => p.lazy()`
- ProviderPipe objects: `lazy()`
- Automatically extracts `mapProvider` from ProviderPipe objects

**IRegistration.pipe() accepts:**
- Raw functions: `(r) => r.bindToKey('key')`
- ProviderPipe objects (extracts `mapProvider` internally)
- Registration-specific pipes: `bindTo()`, `scope()`

**@register() decorator accepts:**
- `MapFn<IRegistration>` functions
- ProviderPipe objects (calls `mapRegistration()` internally)

**Type Guards:**
```typescript
export const isProviderPipe = <T>(obj: unknown): obj is ProviderPipe<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;
```

### Scope Access Rules
Two types of rules:
1. **ScopeMatchRule**: Determines if provider should exist in scope (registration-level)
2. **ScopeAccessRule**: Controls visibility when resolving (provider-level)

### Cross-Scope Dependency Injection Limitation

**Scope System Rule (Similar to JavaScript Scoping):**
The container scope system works like JavaScript's lexical scoping:
- **Inner scopes can access outer scopes**: Dependencies in child scopes can access dependencies from parent scopes ✅
- **Outer scopes cannot access inner scopes**: Dependencies in parent scopes cannot access dependencies from child scopes ❌

**Important:** If dependency A is registered in a parent scope and ONLY for that parent scope (e.g., `scope((c) => c.hasTag('parent'))`), and dependency B is registered per child scope (e.g., `scope((c) => c.hasTag('child'))`), then **dependency A cannot be injected into dependency B** - it will throw a `DependencyNotFoundError`.

This happens because:
1. When **A** is resolved from the parent scope, it tries to resolve its dependencies (including **B**)
2. Resolution searches from child scope upward to parent scope
3. **A** is registered with a scope match rule that only adds it to parent-tagged scopes
4. **A** would try to search dependency **B** in parent scope first and then on parent of parent which is EmptyContainer
5. Result: `DependencyNotFoundError` is thrown when trying to resolve **A**
6. Event if **A** is resolve by child container, internally it would be resolved only from parent container.

**Example of problematic setup:**

```typescript
// Service A - registered only for parent scope
import { inject } from './inject';

@register(
        bindTo('ServiceA'),
        scope((c) => c.hasTag('parent'))
)
class ServiceA {
   constructor(@inject('ServiceB') serviceB: ServiceB) {
      // ❌ Throws DependencyNotFoundError
   }
}

// Service B - registered for child scope, depends on ServiceA
@register(
        bindTo('ServiceB'),
        scope((c) => c.hasTag('child'))
)
class ServiceB {
   constructor(@inject('ServiceA') serviceA: ServiceA) {
     // works out
   }  
}
```

**Workaround:** Register A for both parent and child scopes, or use a less restrictive scope rule:
```typescript
// Option 1: Register for both scopes
scope((c) => c.hasTag('parent') || c.hasTag('child'))

// Option 2: Use scopeAccess for visibility control instead of scope match rules
```

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

Custom error classes in `packages/ts-ioc-container/lib/errors/`:
- `DependencyNotFoundError`: Dependency not found in container chain
- `DependencyMissingKeyError`: Registration without binding key
- `ContainerDisposedError`: Operation on disposed container
- `MethodNotImplementedError`: Abstract method not implemented
- `UnexpectedHookResultError`: Hook returned unexpected result
- `UnsupportedTokenTypeError`: Token type not supported

## Testing

- All code must have corresponding tests in `packages/ts-ioc-container/__tests__/`
- Tests use Jest with `ts-jest`
- Test files mirror the source structure
- Use `moq.ts` for mocking when needed
- Maintain high test coverage
- Use consistent test scope legends (see Test Scope Conventions above)

## Project Structure

```
ts-ioc-container/                    # Root (workspace orchestrator)
├── packages/
│   ├── ts-ioc-container/            # Library package (published to npm)
│   │   ├── lib/                     # Source TypeScript code
│   │   ├── __tests__/               # Test files (mirrors lib/ structure)
│   │   ├── scripts/                 # Build and maintenance scripts
│   │   ├── cjm/, esm/, typings/    # Build outputs (generated, do not edit)
│   │   ├── .readme.hbs.md          # README template source (edit this)
│   │   ├── README.md               # Generated (do not edit directly)
│   │   ├── package.json            # Library npm package config
│   │   ├── tsconfig.json           # TypeScript config
│   │   └── jest.config.json        # Jest config
├── docs/                            # Astro documentation site (workspace)
├── package.json                     # Root orchestrator (private)
├── pnpm-workspace.yaml              # Workspace configuration
├── eslint.config.mjs                # Shared ESLint config
└── pnpm-lock.yaml                   # Lock file
```

## Development Workflow

1. Make changes in `packages/ts-ioc-container/lib/`
2. Add/update tests in `packages/ts-ioc-container/__tests__/`
3. Run `pnpm test` to verify
4. Run `pnpm run type-check` for type safety
5. Run `pnpm run lint:fix` to fix linting issues
6. Run `pnpm run build` to generate outputs
7. If changing API, update `packages/ts-ioc-container/.readme.hbs.md` and run `pnpm run generate:docs`
8. Commit follows conventional commits (use `pnpm run commit` for help)

## Commit Message Conventions

This project follows conventional commits with package-based scopes.

### Allowed Scopes (Package Names)
Scope must be one of:
- `container` - Core IoC container library (ts-ioc-container)
- `react` - React integration package
- `solidjs` - SolidJS integration package
- `express` - Express middleware package
- `fastify` - Fastify plugin package

### Semantic Release Rules
Each package is released independently using semantic-release-monorepo:
- Commits are filtered by package path
- Only commits affecting a package trigger its release

**Commit types that WILL trigger releases:**
- `feat(scope):` - Minor version bump (new feature)
- `fix(scope):` - Patch version bump (bug fix)
- `perf(scope):` - Patch version bump (performance improvement)
- `BREAKING CHANGE:` - Major version bump

**Commit types that will NOT trigger releases:**
- `docs(scope):` - Documentation only
- `test(scope):` - Test only
- `ci(scope):` - CI/CD only
- `chore(scope):` - Maintenance
- `refactor(scope):` - Code refactoring without behavior change
- `style(scope):` - Code style/formatting

### Examples
- ✅ `feat(container): add new provider type`
- ✅ `fix(react): resolve context hook issue`
- ✅ `docs(express): update middleware examples`
- ✅ `chore(fastify): update dependencies`
- ✅ `test(solidjs): add integration tests`

## Notes on Docs Directory

- `docs/` is a separate pnpm workspace (Astro project) with its own package.json
- Managed via pnpm workspace in `pnpm-workspace.yaml`
- Root ESLint ignores `docs/**` (docs has its own Astro-specific config)
- Documentation site has separate lint-staged rules for Astro files
- Use `pnpm --filter ts-ioc-container-docs <command>` to run commands in docs workspace
- Docs dependencies are isolated from root project dependencies
