import { ServiceLocator } from './ServiceLocator';
import { IServiceLocator } from './IServiceLocator';
import { InstanceHook } from './instanceHooks/InstanceHook';
import { IocServiceLocatorStrategyFactory } from './strategy/IocServiceLocatorStrategyFactory';
import { SimpleServiceLocatorStrategyFactory } from './strategy/SimpleServiceLocatorStrategyFactory';

export class ServiceLocatorFactory {
    public createIoCLocator<GContext>(context?: GContext): IServiceLocator<GContext> {
        return new ServiceLocator(new IocServiceLocatorStrategyFactory(), new InstanceHook(), context);
    }

    public createSimpleLocator<GContext>(context?: GContext): IServiceLocator<GContext> {
        return new ServiceLocator(new SimpleServiceLocatorStrategyFactory(), new InstanceHook(), context);
    }
}
