# React adapters for clean use cases


```tsx
import * as React from 'react';
import { FC, useState } from 'react';
import { Scope } from '../lib';
import { AboutPage } from './AboutPage';
import { HomePage } from './HomePage';

const isEven = (value: number) => value % 2 === 0;
const isOdd = (value: number) => value % 2 === 1;
const homeTags = ['home'];
const aboutTags = ['about'];

export const App: FC = (): JSX.Element => {
  const [state, setState] = useState(0);

  return (
    <div>
      <h3>Scopes</h3>
      {isOdd(state) && (
        <Scope context="about" tags={aboutTags}>
          <AboutPage onChangePage={() => setState(0)} />
        </Scope>
      )}
      {isEven(state) && (
        <Scope context="home" tags={homeTags}>
          <HomePage onChangePage={(value) => setState(value)} />
        </Scope>
      )}
    </div>
  );
};
```