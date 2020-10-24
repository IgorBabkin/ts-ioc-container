import { IServiceLocator, RegistrationKey } from 'service-locator';

export interface IUnitTestServiceLocator<GMock> extends IServiceLocator {
    resolveMock(key: RegistrationKey): GMock;
}
