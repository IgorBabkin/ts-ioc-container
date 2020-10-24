import { IMockAdapter } from './IMockAdapter';
import { IServiceLocator } from 'ts-ioc-container';
import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import { UnitTestServiceLocator } from './UnitTestServiceLocator';
import { MockRepository } from './MockRepository';

export class UnitTestServiceLocatorFactory<GMock> {
    constructor(private mockFactory: (...args: any[]) => IMockAdapter<GMock, any>) {}

    public create(locator: IServiceLocator): IUnitTestServiceLocator<GMock> {
        return new UnitTestServiceLocator(locator, new MockRepository((...args) => this.mockFactory(...args)));
    }
}
