import React, { ReactElement } from 'react';
import { useObservables } from '../src';
import { useForceUpdate } from '../src/react/core';
import { Scope, useDependency } from './Scope';
import { AppViewModel } from './AppViewModel';

export function AppView(): ReactElement {
  const model = useDependency(AppViewModel);
  const $ = useObservables({ onUpdate: useForceUpdate(), unusedReaderStrategy: 'destroy-reader' });
  console.log('render');
  return (
    <Scope tags="child">
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
              defaultValue={$(model.firstName$, '')}
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
              defaultValue={$(model.lastName$, '')}
            />
          </dd>
        </dl>
        <h1>
          Full name: {$(model.firstName$, '')} {$(model.lastName$, '')}
        </h1>
        <button onClick={() => model.toggle()}>Toggle</button>
        {$(model.canShowTime$, false) && <div>{new Date($(model.time$, 0) ?? 0).toUTCString()}</div>}
      </div>
    </Scope>
  );
}
