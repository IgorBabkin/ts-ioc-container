import * as React from 'react';
import { render } from 'react-dom';
import { AppView } from './AppView';
import { AppViewModel } from './AppViewModel';

const model = new AppViewModel();
render(<AppView model={model} />, document.getElementById('root'));

if (module.hot) {
    module.hot.accept();
}
