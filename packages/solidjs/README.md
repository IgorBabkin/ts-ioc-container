# @ts-ioc-container/solidjs

SolidJS integration for [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) with automatic scoped container management via SolidJS Context.

## Installation

```bash
npm install @ts-ioc-container/solidjs ts-ioc-container solid-js
# or
pnpm add @ts-ioc-container/solidjs ts-ioc-container solid-js
# or
yarn add @ts-ioc-container/solidjs ts-ioc-container solid-js
```

## Quick Start

```tsx
import 'reflect-metadata';
import { Container } from 'ts-ioc-container';
import { Scope, useInject, ScopeContext } from '@ts-ioc-container/solidjs';

// Create root container
const rootContainer = new Container({ tags: ['application'] });

// Wrap your app with the root scope
function App() {
  return (
    <ScopeContext.Provider value={rootContainer}>
      <Scope tags="page">
        <UserPage />
      </Scope>
    </ScopeContext.Provider>
  );
}

// Use dependencies in components
function UserPage() {
  const userService = useInject<IUserService>('IUserService');
  // ...
}
```

## Features

- **Declarative scoping**: Create nested scopes with the `<Scope>` component
- **Automatic disposal**: Scopes are automatically disposed when components unmount
- **SolidJS primitives**: Uses `createMemo` and `createEffect` for reactive container management
- **TypeScript support**: Full type safety with generics
- **Zero runtime dependencies**: Only peer dependencies required

## Usage

### Setting Up the Root Container

```tsx
import 'reflect-metadata';
import { Container, Registration as R } from 'ts-ioc-container';
import { ScopeContext } from '@ts-ioc-container/solidjs';

// Create root container with application-scoped services
const rootContainer = new Container({ tags: ['application'] })
  .addRegistration(
    R.fromClass(ApiClient).bindTo('IApiClient').pipe(R.singleton()),
    R.fromClass(AuthService).bindTo('IAuthService').pipe(R.singleton()),
  );

function App() {
  return (
    <ScopeContext.Provider value={rootContainer}>
      <Router />
    </ScopeContext.Provider>
  );
}
```

### Creating Child Scopes

Use the `<Scope>` component to create child scopes with specific tags:

```tsx
import { Scope } from '@ts-ioc-container/solidjs';

// Using string tags (comma-separated)
function Dashboard() {
  return (
    <Scope tags="page,dashboard">
      <DashboardContent />
    </Scope>
  );
}

// Using array tags
function UserProfile() {
  return (
    <Scope tags={['page', 'profile']}>
      <ProfileContent />
    </Scope>
  );
}
```

### Resolving Dependencies with `useInject`

```tsx
import { useInject } from '@ts-ioc-container/solidjs';
import { SingleToken } from 'ts-ioc-container';

// Define typed tokens (recommended)
const IUserServiceToken = new SingleToken<IUserService>('IUserService');

function UserList() {
  // Using typed token (recommended)
  const userService = useInject(IUserServiceToken);
  
  // Using string key
  const logger = useInject<ILogger>('ILogger');
  
  // Using class constructor
  const analytics = useInject(AnalyticsService);
  
  // ...
}
```

### Page-Scoped Services

Register services that should be created per-page:

```tsx
import { Container, Registration as R, scope, singleton } from 'ts-ioc-container';

const rootContainer = new Container({ tags: ['application'] })
  .addRegistration(
    // Application-scoped (singleton across entire app)
    R.fromClass(ApiClient)
      .bindTo('IApiClient')
      .pipe(singleton()),

    // Page-scoped (new instance per page)
    R.fromClass(PageViewModel)
      .bindTo('IPageViewModel')
      .pipe(scope((c) => c.hasTag('page')))
      .pipe(singleton()),
  );
```

### Nested Scopes

Scopes can be nested to create hierarchical container trees:

```tsx
function App() {
  return (
    <ScopeContext.Provider value={rootContainer}>
      <Scope tags="page">
        <Layout>
          <Scope tags="widget">
            <UserWidget />
          </Scope>
          <Scope tags="widget">
            <NotificationsWidget />
          </Scope>
        </Layout>
      </Scope>
    </ScopeContext.Provider>
  );
}
```

## API Reference

### `<Scope>`

Creates a child scope container with the specified tags.

**Props:**

```typescript
interface ScopeProps {
  /**
   * Tags for the scope. Can be a comma-separated string or an array of tags.
   * @example tags="page,another-tag"
   * @example tags={['page', 'another-tag']}
   */
  tags: string | Tag[];
  children: JSX.Element;
}
```

**Behavior:**
- Creates a new child container from the parent scope using `createMemo`
- Automatically disposes the container via `createEffect` cleanup
- Provides the new container to all child components via context

### `useInject<T>(token)`

Hook to resolve a dependency from the current scope.

**Parameters:**

- `token: DependencyKey | InjectionToken<T> | constructor<T>` - The dependency key, token, or class

**Returns:**

- `T` - The resolved dependency instance

**Throws:**

- `NotFoundScopeError` if used outside of a `<Scope>` or `ScopeContext.Provider`
- `DependencyNotFoundError` if the dependency cannot be resolved

### `useScopeOrFail()`

Hook to get the current container scope from context.

**Returns:**

- `IContainer` - The current scope container

**Throws:**

- `NotFoundScopeError` if used outside of a `<Scope>` or `ScopeContext.Provider`

### `ScopeContext`

SolidJS context that holds the current container scope. Use `ScopeContext.Provider` to provide a root container.

```tsx
import { ScopeContext } from '@ts-ioc-container/solidjs';

<ScopeContext.Provider value={rootContainer}>
  {props.children}
</ScopeContext.Provider>
```

## How It Works

1. **Root container**: Provided via `ScopeContext.Provider` at the app root
2. **Child scopes**: Created by `<Scope>` components using `container.createScope()`
3. **Reactive management**: Uses SolidJS `createMemo` for memoized scope creation
4. **Automatic cleanup**: Scopes are disposed via `createEffect` cleanup when components unmount

## Best Practices

### Scope Naming Convention

| Scope | Tag | Use Case |
|-------|-----|----------|
| Application | `application` | Global singletons (API clients, auth) |
| Page | `page` | Per-page services (view models, page state) |
| Widget | `widget` | Isolated widget state |

### Performance

- SolidJS's fine-grained reactivity ensures efficient re-renders
- Scope creation is memoized with `createMemo`
- Place `<Scope>` boundaries strategically to balance isolation and performance

### Testing

Test components with mock containers:

```tsx
import { render, screen } from '@solidjs/testing-library';
import { Container, Registration as R } from 'ts-ioc-container';
import { ScopeContext } from '@ts-ioc-container/solidjs';

describe('UserList', () => {
  it('should render users', () => {
    const mockUserService = {
      getUsers: jest.fn().mockReturnValue([{ id: 1, name: 'John' }]),
    };

    const mockContainer = new Container().addRegistration(
      R.fromValue(mockUserService).bindTo('IUserService'),
    );

    render(() => (
      <ScopeContext.Provider value={mockContainer}>
        <UserList />
      </ScopeContext.Provider>
    ));

    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

## License

ISC

## Related

- [ts-ioc-container](https://github.com/IgorBabkin/ts-ioc-container) - The core IoC container library
- [Documentation](https://igorbabkin.github.io/ts-ioc-container) - Full documentation and examples
