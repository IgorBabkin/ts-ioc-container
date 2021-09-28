import { IAppViewModel } from './IAppViewModel';
import React, { FC, useMemo } from 'react';
import { Each, If, Subscription, useObservables } from '../src';
import { interval, of } from 'rxjs';
import { useForceUpdate } from '../src/react/core';
import { map } from 'rxjs/operators';

export const AppView: FC<{ model: IAppViewModel }> = ({ model }) => {
    const $ = useObservables({ onUpdate: useForceUpdate(), unusedReaderStrategy: 'destroy-reader' });
    const observable = useMemo(() => of([5, 6, 7]), []);
    const number$ = useMemo(() => interval(1000), []);
    const number2$ = useMemo(() => number$.pipe(map((value) => value % 2 !== 0)), [number$]);
    // tslint:disable-next-line:no-console
    console.log('render');
    return (
        <div className="app">
            <div>
                <div>
                    <Subscription obs$={observable}>
                        {(v) => v.map((item) => <span key={item}>{item}-</span>)}
                    </Subscription>
                </div>
                <ul>
                    <Each obs$={observable}>{(item) => <li key={item}>{item}</li>}</Each>
                </ul>
                <If obs$={number$} predicate={(value) => value % 2 === 0}>
                    Hello world
                </If>
                <If obs$={number2$}>Hello world 2</If>
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
