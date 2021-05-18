import { inject } from '../../lib';

export class SubGroup3 {
    constructor(@inject('key1') private p1: string, @inject('key2') private p2: string) {}

    privet(): string[] {
        return [this.p1, this.p2];
    }
}

(SubGroup3 as any).prototype._id = 'sss';
