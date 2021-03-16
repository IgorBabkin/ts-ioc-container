import { IServiceLocator, ProviderKey } from 'ts-ioc-container';

export interface IUnitTestServiceLocator<GMock> extends IServiceLocator {
    resolveMock(key: ProviderKey): GMock;
}
