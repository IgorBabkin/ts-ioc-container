import { injectParam } from '../../lib';

export class SubGroup3 {
    constructor(@injectParam('key1') private p1: string, @injectParam('key2') private p2: string) {}

    privet(): string[] {
        return [this.p1, this.p2];
    }
}

(SubGroup3 as any).prototype._id = 'sss';
