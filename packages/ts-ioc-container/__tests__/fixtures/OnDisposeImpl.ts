import { onDispose } from '../../lib/hooks/ioc/onDispose/decorators';

export class OnDisposeImpl {
    isDisposed = false;

    @onDispose
    dispose(): void {
        this.isDisposed = true;
    }
}
