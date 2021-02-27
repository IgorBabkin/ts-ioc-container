import { MockAdapter } from '../../lib/MockAdapter';
import { Mock } from 'moq.ts';

export class MoqAdapter<GInstance> extends MockAdapter<Mock<GInstance>, GInstance> {
    getInstance(): GInstance {
        return this.decorated.object();
    }
}
