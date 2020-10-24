import { IMockAdapter } from './IMockAdapter';

export abstract class MockAdapter<GMock, GInstance> implements IMockAdapter<GMock, GInstance> {
    constructor(protected decorated: GMock) {}

    public getMock(): GMock {
        return this.decorated;
    }

    public abstract getInstance(): GInstance;
}
