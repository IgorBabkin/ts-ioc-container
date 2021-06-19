import { onDispose } from './decorators';

export class OnDisposeImpl {
    isDisposed = false;

    @onDispose
    dispose(): void {
        this.isDisposed = true;
    }
}
