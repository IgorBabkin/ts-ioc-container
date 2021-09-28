import { Subscription } from 'rxjs';
import { ISaga } from './ISaga';

export abstract class Saga implements ISaga {
    private subscriptions: Subscription[] = [];

    initialize(): void {
        this.onInit(this.subscriptions);
    }

    dispose(): void {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions = [];
    }

    protected abstract onInit(subscriptions: Subscription[]): void;
}
