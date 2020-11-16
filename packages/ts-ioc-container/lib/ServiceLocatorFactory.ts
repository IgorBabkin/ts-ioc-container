import { ServiceLocator } from './ServiceLocator';
import { IServiceLocator } from './IServiceLocator';
import { InstanceHook } from './instanceHooks/InstanceHook';
import { IocServiceLocatorStrategyFactory } from './strategy/IocServiceLocatorStrategyFactory';
import { SimpleServiceLocatorStrategyFactory } from './strategy/SimpleServiceLocatorStrategyFactory';

export class ServiceLocatorFactory {
    public createIoCLocator(): IServiceLocator {
        return new ServiceLocator(new IocServiceLocatorStrategyFactory(), new InstanceHook());
    }

    public createSimpleLocator(): IServiceLocator {
        return new ServiceLocator(new SimpleServiceLocatorStrategyFactory(), new InstanceHook());
    }
}
