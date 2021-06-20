import { inject } from '../8/decorators';

export class SubGroup3 {
    constructor(
        @inject((l) => l.resolve('key1')) private p1: string,
        @inject((l) => l.resolve('key2')) private p2: string,
    ) {}

    privet(): string[] {
        return [this.p1, this.p2];
    }
}
