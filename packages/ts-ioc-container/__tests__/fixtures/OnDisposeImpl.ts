import { onDispose } from '../../lib/hooks/ioc/onDispose/decorators';

export class OnDisposeImpl {
    public isDisposed = false;

    @onDispose
    public dispose(): void {
        this.isDisposed = true;
    }
}
