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
