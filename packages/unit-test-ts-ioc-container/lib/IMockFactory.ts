import { IMockAdapter } from './IMockAdapter';

export interface IMockFactory<GMock> {
    create(): IMockAdapter<GMock, any>;
}
