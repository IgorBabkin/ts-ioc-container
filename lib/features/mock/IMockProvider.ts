import { IProvider } from '../../index';
import { IMock } from 'moq.ts';

export interface IMockProvider<T> extends IProvider<T> {
    getMock(): IMock<T>;
}
