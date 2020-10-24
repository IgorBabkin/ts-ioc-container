import { ServiceLocator } from './ServiceLocator';
import { IocServiceLocatorStrategy } from './strategy/ioc/IocServiceLocatorStrategy';
import { metadataCollector } from './strategy/ioc/decorators';
import { IServiceLocator } from './IServiceLocator';
import { SimpleServiceLocatorStrategy } from './strategy/SimpleServiceLocatorStrategy';
import { InstanceHook } from './instanceHooks/InstanceHook';

export class ServiceLocatorFactory {
    public createIoCLocator(): IServiceLocator {
        return new ServiceLocator((l) => new IocServiceLocatorStrategy(l, metadataCollector), new InstanceHook());
    }

    public createSimpleLocator(): IServiceLocator {
        return new ServiceLocator((l) => new SimpleServiceLocatorStrategy(l), new InstanceHook());
    }
}
