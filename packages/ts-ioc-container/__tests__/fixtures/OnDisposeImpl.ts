import { onDispose } from '../../lib';

export class OnDisposeImpl {
    isDisposed = false;

    @onDispose
    dispose(): void {
        this.isDisposed = true;
    }
}
