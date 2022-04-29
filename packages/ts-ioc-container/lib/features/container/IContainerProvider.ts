import { IServiceLocator } from '../../core/IServiceLocator';

export interface IContainerProvider<T> {
    appendTo(locator: IServiceLocator): void;
}
