import { Observable } from 'rxjs';

export interface IAppViewModel {
    lastName$: Observable<string>;
    firstName$: Observable<string>;
    canShowTime$: Observable<boolean>;
    time$: Observable<number>;
    myNumbers$: Observable<number>;

    toggle(): void;

    changeFirstName(value: string): void;

    changeLastName(value: string): void;
}
