![NPM version:latest](https://img.shields.io/npm/v/ts-constructor-injector/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-constructor-injector.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-constructor-injector)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
![License](https://img.shields.io/npm/l/ts-constructor-injector)

# ts-constructor-injector
Dependency injection for typescript classes

## Install
```shell script
npm install ts-constructor-injector reflect-metadata
```
```shell script
yarn add ts-constructor-injector reflect-metadata
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
import { inject, resolve } from "@ibabkin/utils";

class Logger {
  constructor(@inject(context => context.topic) private name: string) {
  }
}

const logger = resolve({topic: 'main'})(Logger);
```

### Hooks

```typescript
import { hook, getHooks } from "@ibabkin/utils";

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
import { handleAsyncError } from "@ibabkin/utils";

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

