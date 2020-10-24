import { RegistrationKey } from 'ts-ioc-container';
import { IMockAdapter } from './IMockAdapter';

export interface IMockRepository<GMock> {
    findMock<GInstance>(key: RegistrationKey): IMockAdapter<GMock, GInstance>;
}
