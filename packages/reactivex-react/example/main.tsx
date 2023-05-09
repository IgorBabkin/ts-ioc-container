import * as React from 'react';
import { render } from 'react-dom';
import { AppView } from './AppView';
import { ScopeContext } from './Scope';
import { development } from './env/development';

const container = development();

render(
    <ScopeContext.Provider value={container}>
        <AppView />
    </ScopeContext.Provider>,
    document.getElementById('root'),
);
