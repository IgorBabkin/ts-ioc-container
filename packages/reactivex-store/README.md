# Observable store

## Usage

```ts
import { ObservableStore } from "./ObservableStore";

const store = new ObservableStore(2);
store.toObservable().subscribe(value => {
  console.log(value); // 2, 3, 1
});
store.map(v => v + 1);
store.map(v => v - 2);
```
