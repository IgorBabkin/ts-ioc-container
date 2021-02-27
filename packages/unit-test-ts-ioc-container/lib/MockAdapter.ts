import { IMockAdapter } from './IMockAdapter';

export abstract class MockAdapter<GMock, GInstance> implements IMockAdapter<GMock, GInstance> {
    constructor(protected decorated: GMock) {}

    getMock(): GMock {
        return this.decorated;
    }

    public abstract getInstance(): GInstance;
}
