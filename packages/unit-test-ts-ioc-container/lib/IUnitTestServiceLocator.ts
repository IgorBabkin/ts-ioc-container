import { IServiceLocator, RegistrationKey } from 'ts-ioc-container';

export interface IUnitTestServiceLocator<GMock> extends IServiceLocator {
    resolveMock(key: RegistrationKey): GMock;
}
