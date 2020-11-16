import { IUnitTestServiceLocator } from './IUnitTestServiceLocator';
import { UnitTestServiceLocator } from './UnitTestServiceLocator';
import { IMockFactory } from './IMockFactory';
import { IocServiceLocatorStrategyFactory, InstanceHook, SimpleServiceLocatorStrategyFactory } from 'ts-ioc-container';

export class UnitTestServiceLocatorFactory<GMock> {
    constructor(private mockFactory: IMockFactory<GMock>) {}

    public createIoCLocator(): IUnitTestServiceLocator<GMock> {
        return new UnitTestServiceLocator(new IocServiceLocatorStrategyFactory(), new InstanceHook(), this.mockFactory);
    }

    public createSimpleLocator(): IUnitTestServiceLocator<GMock> {
        return new UnitTestServiceLocator(
            new SimpleServiceLocatorStrategyFactory(),
            new InstanceHook(),
            this.mockFactory,
        );
    }
}
