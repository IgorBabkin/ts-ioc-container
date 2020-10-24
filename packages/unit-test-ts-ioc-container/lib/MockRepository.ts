import { IMockRepository } from './IMockRepository';
import { RegistrationKey } from 'ts-ioc-container';
import { IMockAdapter } from './IMockAdapter';

export class MockRepository<GMock> implements IMockRepository<GMock> {
    private mocks = new Map<RegistrationKey, IMockAdapter<GMock, any>>();

    constructor(private mockFactory: (...args: any[]) => IMockAdapter<GMock, any>) {}

    public findMock<GInstance>(key: RegistrationKey): IMockAdapter<GMock, GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.mockFactory());
        }
        return this.mocks.get(key);
    }
}
