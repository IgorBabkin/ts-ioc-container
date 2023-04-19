![NPM version:latest](https://img.shields.io/npm/v/ts-constructor-injector/latest.svg?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/ts-constructor-injector.svg?style=flat-square)
![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/ts-constructor-injector)
![License](https://img.shields.io/npm/l/ts-constructor-injector)

# Injects dependencies into constructor

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
import { inject, resolve } from "ts-constructor-injector";

class Logger {
  constructor(@inject(context => context.topic) private name: string) {
  }
}

const logger = resolve({topic: 'main'})(Logger);
```

### Reflectors

```typescript
import { AsyncMethodReflector, MethodReflector } from "ts-constructor-injector";
import { onDispose } from "./di";

export const onConstructReflector = new MethodReflector('OnConstructHook');
export const onConstruct = onConstructReflector.createMethodHookDecorator();

export const onDisposeReflector = new AsyncMethodReflector('OnDisposeHook');
export const onDispose = onDisposeReflector.createMethodHookDecorator();

class Logger {
  @onConstruct
  initialize() {
    console.log('initialized');
  }

  @onDispose
  async dispose(): Promise<void> {
    console.log('disposed');
  }
}

(async () => {
  const instance = new Logger();
  onConstructReflector.invokeHooksOf(instance); // initialized
  await onDisposeReflector.invokeHooksOf(instance); // disposed  
})()
```
