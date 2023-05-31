import { IContainer, InjectionToken } from '@ibabkin/ts-ioc-container';

export interface IContext<T> {
    getValue(): T;

    setValue(value: T): void;

    hasValue(): boolean;
}

export const context =
    <T>(key: InjectionToken<IContext<T>>) =>
    (l: IContainer) =>
        l.resolve<IContext<T>>(key).getValue();
