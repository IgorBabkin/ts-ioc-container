import { SubGroup } from './SubGroup';
import { SubGroup2 } from './SubGroup2';
import { SubGroup3 } from './SubGroup3';
import { inject } from '../../ioc/IocInjector';

export class Group {
    constructor(
        @inject((l) => l.resolve('key1')) private p1: string,
        @inject((l) => l.resolve(SubGroup)) private subGroup: SubGroup,
        @inject((l) => (v: number) => l.resolve(SubGroup2, v)) private factory: (v: number) => SubGroup2,
        @inject((l) => l.resolve('key3')) private group3: SubGroup3,
        private p2: string,
        private p3: string,
    ) {}

    privet(): string[] {
        const subGroup1 = this.factory(1);
        const subGroup2 = this.factory(2);
        return [
            this.p1,
            this.p2,
            this.p3,
            ...this.subGroup.privet(),
            ...subGroup1.privet(),
            ...subGroup2.privet(),
            ...this.group3.privet(),
        ];
    }
}
