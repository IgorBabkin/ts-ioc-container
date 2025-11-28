# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is **ts-ioc-container**, a TypeScript Inversion of Control (IoC) container library. It provides dependency injection capabilities using decorators and metadata reflection. The library supports advanced features like scoped containers, lazy initialization, hooks, and various injection strategies.

## Common Development Commands

### Build
```bash
npm run build              # Build all outputs (CommonJS, ESM, types)
npm run build:cjm          # Build CommonJS output to cjm/
npm run build:esm          # Build ES modules output to esm/
npm run build:types        # Build TypeScript type definitions to typings/
```

### Testing
```bash
npm test                   # Run all tests with coverage
jest                       # Run tests without coverage
jest path/to/test.spec.ts  # Run a single test file
jest -t "test name"        # Run tests matching a name pattern
```

### Code Quality
```bash
npm run lint               # Lint all TypeScript files
npm run lint:fix           # Auto-fix linting issues
npm run type-check         # Run TypeScript type checking
npm run type-check:watch   # Watch mode for type checking
npm run format             # Format all TypeScript files with Prettier
```

### Documentation
```bash
npm run generate:docs      # Generate README.md from template
```

### Release
```bash
npm run release            # Build, test, and publish to npm
```

## Architecture

### Core Concepts

The library implements a layered architecture with four main components that work together:

1. **Container** - The central registry that manages providers, instances, and scopes
2. **Provider** - Factory functions that create dependencies with transformations (singleton, args, decorators)
3. **Registration** - Connects providers to dependency keys and applies scope rules
4. **Injector** - Resolves constructor dependencies using various strategies (metadata, proxy, simple)

### Key Design Patterns

#### Dependency Resolution Flow
When resolving a dependency:
1. Container checks if it has a provider for the requested key
2. If found, checks scope access permissions
3. Provider applies any transformations (args, lazy, singleton)
4. Injector resolves constructor parameters recursively
5. Instance is created and stored in the container
6. onConstruct hooks are executed

#### Scope Hierarchy
- Containers can have parent-child relationships forming a hierarchy
- Child scopes inherit providers from parents but can override them
- Each scope can have tags for conditional registration
- Providers can restrict visibility based on invocation/provider scope

#### Provider Transformations
Providers use a pipe pattern for composability:
- `singleton()` - Cache instances per scope
- `args()` / `argsFn()` - Bind constructor arguments
- `scopeAccess()` - Control visibility between scopes
- `decorate()` - Wrap instances with additional logic
- `lazy()` - Defer instantiation until first access

### Directory Structure

```
lib/                        # Source code
├── container/              # Container implementation and scope management
│   ├── Container.ts        # Main container with resolution logic
│   ├── EmptyContainer.ts   # Null object pattern for parent references
│   └── AliasMap.ts         # Maps aliases to dependency keys
├── provider/               # Provider implementations and transformations
│   ├── Provider.ts         # Base provider class
│   ├── SingletonProvider.ts # Singleton caching logic
│   ├── DecoratorProvider.ts # Decorator pattern support
│   └── Cache.ts            # Caching strategies (single/multi-arg)
├── registration/           # Registration logic and decorators
│   ├── Registration.ts     # Connects providers to keys
│   └── IRegistration.ts    # Decorator functions (@register)
├── injector/               # Dependency injection strategies
│   ├── MetadataInjector.ts # Uses reflect-metadata and @inject
│   ├── SimpleInjector.ts   # Passes container as first arg
│   ├── ProxyInjector.ts    # Passes dependencies as object
│   └── inject.ts           # @inject decorator implementation
├── hooks/                  # Lifecycle hooks
│   ├── HooksRunner.ts      # Executes hooks with metadata
│   ├── onConstruct.ts      # Post-construction hooks
│   └── onDispose.ts        # Pre-disposal hooks
├── token/                  # Token types for advanced resolution
│   ├── IDToken.ts          # Type-safe dependency keys
│   ├── AliasToken.ts       # Resolve by alias
│   └── InstanceListToken.ts # Collect all instances
├── errors/                 # Custom error types
└── index.ts                # Public API exports

__tests__/                  # Test files mirroring lib/ structure
cjm/                        # Built CommonJS output
esm/                        # Built ES modules output
typings/                    # Built TypeScript definitions
```

### Important Implementation Details

#### Metadata and Decorators
- Requires `reflect-metadata` imported before any decorators are used
- TypeScript must have `experimentalDecorators` and `emitDecoratorMetadata` enabled
- `@inject()` decorator stores resolution strategies in metadata
- Use `@register()` to apply transformations at class definition time

#### Lazy Resolution
- Creates a Proxy that defers instantiation until first property/method access
- Preserves singleton behavior - same proxy always resolves to same instance
- Useful for breaking circular dependencies or improving startup performance

#### Multi-Argument Caching
- `MultiCache.fromFirstArg` enables singleton-per-first-argument
- Useful for factory patterns (e.g., `EntityManager` per repository type)
- See `IEntityManager` examples in README for usage patterns

#### Alias Resolution
- Aliases group multiple providers under a single logical name
- `resolveByAlias()` returns all matching providers across scopes
- `resolveOneByAlias()` returns first match
- Used for plugin/middleware patterns

#### Testing Utilities
The library uses moq.ts for mocking in tests. Key testing approaches:
- Create isolated containers per test
- Use scopes to test provider visibility
- Test provider transformations independently
- Mock dependencies by registering test doubles

## Code Style

### TypeScript Patterns
- Use constructor injection with `@inject()` decorator
- Export interfaces prefixed with `I` (e.g., `IContainer`, `IProvider`)
- Prefer composition via `.pipe()` over inheritance
- Use static factory methods (e.g., `Provider.fromClass()`)

### Naming Conventions
- Classes: PascalCase (e.g., `Container`, `MetadataInjector`)
- Interfaces: IPascalCase (e.g., `IContainer`, `IProvider`)
- Decorators: camelCase (e.g., `@inject`, `@register`, `@onConstruct`)
- Helper functions: camelCase (e.g., `singleton()`, `bindTo()`)

### Error Handling
- All custom errors extend base Error class
- Error names follow pattern: `<Concept><Problem>Error`
- Include descriptive messages for debugging
- See lib/errors/ for existing error types

## Common Patterns

### Registering Dependencies
```typescript
// Simple class registration
container.addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

// With decorators on the class
@register(bindTo('ILogger'), singleton())
class Logger {}
container.addRegistration(R.fromClass(Logger));

// With transformations
container.register('IConfig', 
  Provider.fromClass(Config).pipe(
    args('/path/to/config'),
    singleton()
  )
);
```

### Resolving Dependencies
```typescript
// By key
const logger = container.resolve<Logger>('ILogger');

// By class (uses injector)
const app = container.resolve(App);

// With arguments
const config = container.resolve('IConfig', { args: ['/custom/path'] });

// Lazy resolution
const lazy = container.resolve('ILogger', { lazy: true });
```

### Creating Scopes
```typescript
// Create child scope with tags
const requestScope = rootContainer.createScope({ tags: ['request'] });

// Register providers for specific scopes
@register(
  bindTo('ILogger'),
  scope((s) => s.hasTag('request')),
  singleton()
)
class RequestLogger {}
```

### Using Hooks
```typescript
// Property injection
class App {
  @hook('onInit', injectProp('config'))
  config!: Config;
}

// Method hooks
class Service {
  @onDispose(execute)
  cleanup() {
    // Called on dispose
  }
}
```
