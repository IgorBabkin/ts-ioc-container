import { onDispose } from '../decorators';
import { IHomeModel } from './IHomeModel';

export class HomeModel implements IHomeModel {
    value = 1;

    @onDispose
    dispose() {
        console.log('dispose home model');
    }
}
