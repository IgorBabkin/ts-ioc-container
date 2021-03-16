import { IMockFactory } from '../../lib/IMockFactory';
import { Mock } from 'moq.ts';
import { IMockAdapter } from '../../lib/IMockAdapter';
import { MoqAdapter } from './MoqAdapter';

export class MoqFactory implements IMockFactory<Mock<any>> {
    create(): IMockAdapter<Mock<any>, any> {
        return new MoqAdapter(new Mock());
    }
}
