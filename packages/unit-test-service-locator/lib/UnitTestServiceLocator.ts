import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import { ServiceLocatorDecorator, RegistrationKey, IServiceLocator } from 'service-locator';
import { IMockRepository } from './IMockRepository';

export class UnitTestServiceLocator<GMock> extends ServiceLocatorDecorator implements IUnitTestServiceLocator<GMock> {
    constructor(decorated: IServiceLocator, private mockRepository: IMockRepository<GMock>) {
        super(decorated);
    }

    public resolveMock(key: RegistrationKey): GMock {
        return this.mockRepository.findMock(key).getMock();
    }

    public resolve<T>(key: string): T {
        if (!this.decorated.has(key)) {
            const mock = this.mockRepository.findMock<T>(key);
            this.decorated.registerInstance<T>(key, mock.getInstance());
        }
        return this.decorated.resolve<T>(key);
    }
}
