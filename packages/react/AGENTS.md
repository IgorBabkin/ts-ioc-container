# @ts-ioc-container/react — guide for AI coding agents

React bindings for [`ts-ioc-container`](https://www.npmjs.com/package/ts-ioc-container).
This file ships inside the npm package, so it matches the installed version.
For the container itself, read `node_modules/ts-ioc-container/AGENTS.md` first.

## API

| Export | What it does |
| --- | --- |
| `ScopeContext` | React context holding the current `IContainer`. Put the root container in it with `ScopeContext.Provider` |
| `Scope` | `<Scope tags={[...]}>`: creates a child scope for its subtree once and disposes it on unmount |
| `useScope()` | The surrounding scope, or `null` |
| `useScopeOrFail()` | The surrounding scope; throws `OutOfScopeError` when there is none |
| `useResolveOrFail(tokenOrClass)` | Resolves a token (`token.resolve(scope)`) or a class from the surrounding scope |
| `OutOfScopeError` | Thrown outside a scope. `code: 'IOC_OUT_OF_SCOPE'` |

## Recipe

```tsx
import 'reflect-metadata';
import { bindTo, Container, register, Registration as R, scope, singleton, SingleToken } from 'ts-ioc-container';
import { Scope, ScopeContext, useResolveOrFail } from '@ts-ioc-container/react';

interface IGreeter {
  greet(): string;
}
const IGreeterToken = new SingleToken<IGreeter>('IGreeter');

// one instance per widget scope
@register(bindTo(IGreeterToken), scope((s) => s.hasTag('widget')), singleton())
class Greeter implements IGreeter {
  greet() {
    return 'hello';
  }
}

const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Greeter));

function Greeting() {
  const greeter = useResolveOrFail(IGreeterToken);
  return <p>{greeter.greet()}</p>;
}

export function App() {
  return (
    <ScopeContext.Provider value={app}>
      <Scope tags={['page']}>
        <Scope tags={['widget']}>
          <Greeting />
        </Scope>
      </Scope>
    </ScopeContext.Provider>
  );
}
```

Frontend scope tags are `application` / `page` / `widget`.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `OutOfScopeError` | No `ScopeContext.Provider` above the component | Wrap the root in `<ScopeContext.Provider value={container}>` |
| `DependencyNotFoundError` in a component | The registration's `scope(...)` rule does not match any scope on the path | Add a `<Scope tags={[...]}>` with the matching tag, or relax the rule |
| Subtree uses a disposed scope in development | `StrictMode` unmounts and remounts effects, which disposes the `Scope`'s child | Render `Scope` outside `StrictMode` |
| Registration added later is missing | Child scopes copy registrations when they are created | Register on the root container before rendering |
