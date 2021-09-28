import { Observable } from 'rxjs';

export class ObservableNotFoundError<T> extends Error {
    name = 'ObservableNotFoundError';
    constructor(obs$: Observable<T>) {
        super(`Cannot find observable ${obs$}`);

        Object.setPrototypeOf(this, ObservableNotFoundError.prototype);
    }
}
