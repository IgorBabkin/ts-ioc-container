import { onDispose } from '../decorators';

export const IAboutModelKey = Symbol.for('IAboutModel');

export class AboutModel {
    value = 0;

    @onDispose
    dispose() {
        console.log('dispose about model');
    }
}
