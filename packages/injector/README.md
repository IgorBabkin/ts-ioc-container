![NPM version:latest](https://img.shields.io/npm/v/ts-constructor-injector/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-constructor-injector.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-constructor-injector)
![License](https://img.shields.io/npm/l/ts-constructor-injector)

# Injects dependencies into constructor

## Install
```shell script
npm install @ibabkin/ts-constructor-injector reflect-metadata
```
```shell script
yarn add @ibabkin/ts-constructor-injector reflect-metadata
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Usage
```typescript
import { inject, resolve } from "@ibabkin/ts-constructor-injector";

class Logger {
  constructor(@inject(context => context.topic) private name: string) {
  }
}

const logger = resolve({topic: 'main'})(Logger);
```

### Reflectors

```typescript
import { AsyncMethodReflector, MethodReflector } from "@ibabkin/ts-constructor-injector";

export const onConstructReflector = new MethodReflector('OnConstructHook');
export const onConstruct = onConstructReflector.createMethodHookDecorator();

export const onDisposeReflector = new AsyncMethodReflector('OnDisposeHook');
export const onDispose = onDisposeReflector.createMethodHookDecorator();

class Logger {
  @onConstruct
  initialize(state: string) {
    console.log(state);
  }

  @onDispose
  async dispose(state: string): Promise<void> {
    console.log(state);
  }
}

(async () => {
  const instance = new Logger();
  onConstructReflector.invokeHooksOf(instance, 'initialized); // initialized
  await onDisposeReflector.invokeHooksOf(instance, 'disposed'); // disposed  
})()
```

### Hooks

```typescript
import { hook, getHooks } from "@ibabkin/ts-constructor-injector";

class Logger {
  @hook('onDispose')
  async dispose(message: string): Promise<void> {
    console.log(message);
  }
}

(async () => {
  const instance = new Logger();
  for (const hook of getHooks(instance, 'onDispose')) {
    await instance[hook]('disposed'); // disposed
  }
})()
```

### ErrorHandler

```typescript
import { handleAsyncError } from "@ibabkin/ts-constructor-injector";

const prismaToDomainError: HandleErrorParams = (error, context) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        throw new PersistenceConflictError(errorToString(error));
      case "P2025":
        throw new EntityNotFoundError(errorToString(error));
      default:
        throw new PersistenceError(errorToString(error));
    }
  }

  throw new UnknownError(errorToString(error));
};

class AsyncRepo {
  @handleAsyncError(prismaToDomainError)
  async saveSmth() {
    await sleep(1000);
    throw new Prisma.PrismaClientKnownRequestError("P2002");
  }
}

class Repo {
  @handleError(prismaToDomainError)
  saveSmth() {
    throw new Prisma.PrismaClientKnownRequestError("P2002");
  }
}
```

