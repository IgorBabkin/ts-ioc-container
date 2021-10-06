import React, { FC } from 'react';
import { useDependency } from '../lib';
import { IHomeModel, IHomeModelKey } from './models/IHomeModel';

export const HomePage: FC<{ onChangePage: (value: number) => void }> = ({ onChangePage }) => {
    const model = useDependency<IHomeModel>(IHomeModelKey);
    return (
        <div>
            <h3>HomePage</h3>
            <button onClick={() => onChangePage(model.value)}>AboutPage</button>
        </div>
    );
};
