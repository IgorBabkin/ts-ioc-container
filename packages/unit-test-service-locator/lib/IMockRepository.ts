import { RegistrationKey } from 'service-locator';
import { IMockAdapter } from './IMockAdapter';

export interface IMockRepository<GMock> {
    findMock<GInstance>(key: RegistrationKey): IMockAdapter<GMock, GInstance>;
}
