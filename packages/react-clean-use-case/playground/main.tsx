import 'reflect-metadata';
import * as React from 'react';
import { FC, useState } from 'react';
import { render } from 'react-dom';
import { LocatorContext, Scope } from '../lib';
import { HomePage } from './HomePage';
import { AboutPage } from './AboutPage';
import { InjectMetadataCollector, IocLocatorBuilder } from 'ts-ioc-container';
import { LocatorAdapter } from './LocatorAdapter';

const isEven = (value: number) => value % 2 === 0;
const isOdd = (value: number) => value % 2 === 1;

export const App: FC = (): JSX.Element => {
    const [state, setState] = useState(0);

    return (
        <div>
            <h3>Scopes</h3>
            {isOdd(state) && (
                <Scope>
                    <AboutPage onChangePage={() => setState(0)} />
                </Scope>
            )}
            {isEven(state) && (
                <Scope>
                    <HomePage onChangePage={() => setState(1)} />
                </Scope>
            )}
        </div>
    );
};

const locator = new IocLocatorBuilder(new InjectMetadataCollector(Symbol.for('contructor'))).build();

render(
    <LocatorContext.Provider value={new LocatorAdapter(locator)}>
        <App />
    </LocatorContext.Provider>,
    document.getElementById('root'),
);

if (module.hot) {
    module.hot.accept();
}
