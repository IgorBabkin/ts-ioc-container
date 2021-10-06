import React, { FC } from 'react';
import { useDependency } from '../lib';
import { IAboutModelKey } from './models/AboutModel';
import { IAboutModel } from './models/IAboutModel';

export const AboutPage: FC<{ onChangePage: (value: number) => void }> = ({ onChangePage }) => {
    const model = useDependency<IAboutModel>(IAboutModelKey);
    return (
        <div>
            <h3>AboutPage</h3>
            <button onClick={() => onChangePage(model.value)}>HomePage</button>
        </div>
    );
};
