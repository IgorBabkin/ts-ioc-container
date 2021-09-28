import { Observable, Subscription } from 'rxjs';
import { IObservableReader } from './IObservableReader';

export type ReaderObserver = <T>(value: T) => void;

export class ObservableReader<T> implements IObservableReader<T> {
    current: T | undefined;
    private isEnabled = false;
    private subscription: Subscription | undefined;

    constructor(readonly obs$: Observable<T>, private observer: (value: T) => void) {}

    disable(): this {
        this.isEnabled = false;
        this.subscription?.unsubscribe();
        return this;
    }

    enable(): this {
        if (this.isEnabled) {
            return this;
        }
        this.subscription = this.obs$.subscribe((v) => {
            this.current = v;
            if (this.isEnabled) {
                this.observer(v);
            }
        });
        this.isEnabled = true;
        return this;
    }

    dispose(): void {
        this.isEnabled = false;
        this.subscription?.unsubscribe();
    }
}
