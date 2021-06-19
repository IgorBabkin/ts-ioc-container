import { onDispose } from '../1/decorators';

export class OnDisposeImpl {
    isDisposed = false;

    @onDispose
    dispose(): void {
        this.isDisposed = true;
    }
}
