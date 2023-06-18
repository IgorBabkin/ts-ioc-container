[![NPM version:latest](https://img.shields.io/npm/v/reactivex-react/latest.svg?style=flat-square)](https://www.npmjs.com/package/reactivex-react)
[![npm downloads](https://img.shields.io/npm/dt/reactivex-react.svg?style=flat-square)](https://www.npmjs.com/package/reactivex-react)
[![Coverage Status](https://coveralls.io/repos/github/IgorBabkin/ts-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/IgorBabkin/ts-ioc-container?branch=master)
[![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/reactivex-react.svg)](https://www.npmjs.com/package/reactivex-react)
[![License](https://img.shields.io/npm/l/reactivex-react)](https://www.npmjs.com/package/reactivex-react)

# reactivex-react
React hooks to observe values from RxJs Observable.

## Advantages

- lazy - it doesn't enable until you invoke it
- disable automatically from not used values
- disable automatically when component is unmounted

## How to install

```sh
npm install reactivex-react # NPM
yarn add reactivex-react # Yarn
```

## Usage

- `const $ = useObservables({onUpdate: useForceUpdate(), unusedReaderStrategy: 'destroy-reader'})` - creates function to read & subscribe to observables.
- `const value = useObservable(obs$, useForceUpdate())` - read & subscribe to observable.
- `<Subscription obs$={observable} fallback={() => <span>NoValue</span>}>{(value) => <h1>{value}</h1>}</Subscription>` - react component to read & subscript observable value
- `<Each obs$={observable}>{(v) => <li key={v}>{v}</li>}</Each>` - react component to read & subscript observable array value
- `<If obs$={number$} predicate={(value) => value % 2 === 0}>Hello world</If>` - react component to read & subscript observable value

[See example](https://github.com/IgorBabkin/rxjs-react/blob/master/example/AppView.tsx)

```tsx
import { IAppViewModel } from './IAppViewModel';
import React, { FC, useMemo } from 'react';
import { Each, If, Subscription, useObservables } from '../src';
import { interval, of } from 'rxjs';
import { useForceUpdate } from '../src/react/core';

export const AppView: FC<{ model: IAppViewModel }> = ({ model }) => {
  const $ = useObservables({ onUpdate: useForceUpdate(), unusedReaderStrategy: 'destroy-reader' });
  const observable = useMemo(() => of([5, 6, 7]), []);
  const number$ = useMemo(() => interval(1000), []);
  // tslint:disable-next-line:no-console
  console.log('render');
  return (
    <div className="app">
      <div>
        <div>
          <Each obs$={observable}>{(v) => <span key={v}>{v}-</span>}</Each>
        </div>
        <ul>
          <Subscription obs$={observable}>{(v) => v.map((item) => <li key={item}>{item}</li>)}</Subscription>
        </ul>
        <If obs$={number$} predicate={(value) => value % 2 === 0}>
          Hello world
        </If>
        <ul>
          <Each obs$={observable}>{(v) => <li key={v}>{v}</li>}</Each>
        </ul>
      </div>
      <dl>
        <dt>
          <label htmlFor="firstname">First name</label>
        </dt>
        <dd>
          <input
            id="firstname"
            type="text"
            onChange={(e) => model.changeFirstName(e.target.value)}
            defaultValue={$(model.firstName$)}
          />
        </dd>

        <dt>
          <label htmlFor="lastname">Last name</label>
        </dt>
        <dd>
          <input
            id="lastname"
            type="text"
            onChange={(e) => model.changeLastName(e.target.value)}
            defaultValue={$(model.lastName$)}
          />
        </dd>
      </dl>
      <h1>
        Full name: {$(model.firstName$)} {$(model.lastName$)}
      </h1>
      <button onClick={() => model.toggle()}>Toggle</button>
      {$(model.canShowTime$) && <div>{new Date($(model.time$) ?? 0).toUTCString()}</div>}
    </div>
  );
};


export class AppViewModel implements IAppViewModel {
    public time$: Observable<number>;
    public firstName$ = new BehaviorSubject<string>('');
    public lastName$ = new BehaviorSubject<string>('');
    public myNumbers$ = from([1, 2, 3, 4]);
    public canShowTime$ = new BehaviorSubject(false);

    constructor() {
        this.time$ = timer(2000, 1000).pipe(
            map(() => Date.now()),
        );
    }

    public toggle(): void {
        this.canShowTime$.next(!this.canShowTime$.getValue());
    }

    public changeFirstName(value: string): void {
        this.firstName$.next(value);
    }

    public changeLastName(value: string): void {
        this.lastName$.next(value);
    }
}

```

## Under the hood
### React hook

```typescript
import { Observable } from 'rxjs';
import { useCallback, useEffect, useMemo } from 'react';
import { IObservableStorage } from '../storage/IObservableStorage';
import { useForceUpdate } from './core';
import { CleanMode, ObservableStorageBuilder } from '../storage/ObservableStorageBuilder';
import { ObservableReader } from '../storage/reader/ObservableReader';
import { IObservableReader } from '../storage/reader/IObservableReader';

export type Reader = <T>(obs$: Observable<T>) => T | undefined;

export type UseObservablesProps = {
  unusedReaderStrategy: CleanMode;
  onUpdate: () => void;
};

function useObservableStorage(props: Partial<UseObservablesProps> = {}): IObservableStorage {
  const forceUpdate = useForceUpdate();
  const { onUpdate = forceUpdate, unusedReaderStrategy = 'disable-reader' } = props;
  return useMemo(
    () => ObservableStorageBuilder.fromObserver(onUpdate).changeCleanupMode(unusedReaderStrategy).build(),
    [onUpdate, unusedReaderStrategy],
  );
}

export function useObservables(props: Partial<UseObservablesProps> = {}): Reader {
  const observableStorage = useObservableStorage(props);
  useEffect(() => () => observableStorage.dispose(), [observableStorage]);
  useEffect(() => observableStorage.cleanup());
  return useCallback((obs$) => observableStorage.getValue(obs$), [observableStorage]);
}

function useObservableReader<T>(obs$: Observable<T>, onUpdate: () => void): IObservableReader<T> {
  return useMemo(() => new ObservableReader(obs$, onUpdate).enable(), [obs$, onUpdate]);
}

export const useObservable: Reader = (obs$, onUpdate?: () => void) => {
  const forceUpdate = useForceUpdate();
  const reader = useObservableReader(obs$, onUpdate || forceUpdate);
  useEffect(() => () => reader.disable(), [reader]);
  return reader.current;
};
```

### Subscription React Component

```tsx
interface SubscriptionProps<T> {
  obs$: Observable<T>;
  children?: (value: T) => ReactNode | undefined;
  fallback?: () => ReactNode | undefined;
}

export function Subscription<T>({
  obs$,
  children = (value: T) => value,
  fallback = () => undefined,
}: PropsWithChildren<SubscriptionProps<T>>): JSX.Element {
  const value = useObservable(obs$);
  return <>{value === undefined ? fallback() : children(value)}</>;
}

interface EachProps<T> {
  obs$: Observable<T[]>;
  children: (value: T) => ReactNode | undefined;
}

export function Each<T>({ obs$, children }: PropsWithChildren<EachProps<T>>): JSX.Element {
  const value = useObservable(obs$);
  return <>{value !== undefined ? value.map(children) : undefined}</>;
}

interface IfProps<T> {
  obs$: Observable<T>;
  predicate?: (value: T) => boolean;
}

export function If<T>({
  obs$,
  children,
  predicate = (value: T) => !!value,
}: PropsWithChildren<IfProps<T>>): JSX.Element {
  const value = useObservable(obs$);
  return <>{value !== undefined && predicate(value) ? children : undefined}</>;
}
```

## API

- `useObservables` - React hook to observe multiple rxjs streams.
- `useObservable` - React hook to observe single observable.
- `Subscription` - React component to observe single rxjs stream (Observable<T>).
- `Each` - React component to observe a rxjs stream (Observable<T[]>).
- `If` - React conditional component to observe a rxjs stream.
- `ObservableStorageBuilder` - builder of ObservableStorage (main class).
- `ObservableStorage` - storage of observable readers withy opportunity to clean up inactive observables (facade).
- `ReaderRepository` - repository of observable readers.
- `ObservableReader` - reader of singe observable.
