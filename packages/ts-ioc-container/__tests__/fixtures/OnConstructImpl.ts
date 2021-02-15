import { onConstruct } from '../../lib';

export class OnConstructImpl {
    public isConstructed = false;

    @onConstruct
    public onInit(): void {
        this.isConstructed = true;
    }
}
