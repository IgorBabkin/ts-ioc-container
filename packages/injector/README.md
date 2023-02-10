# Injects dependencies into constructor

## Install
```shell
npm install ts-constructor-injector
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
