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

## API

- `useObservables` - React hook to observe multiple rxjs streams.
