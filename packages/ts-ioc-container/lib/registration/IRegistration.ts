import { IContainer } from '../container/IContainer';

export interface IRegistration {
    appendTo(container: IContainer): void;
}
