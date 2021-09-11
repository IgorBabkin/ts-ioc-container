import { InjectFn } from '../../features/ioc/InjectFn';
import { InjectionToken } from '../../core/IServiceLocator';
import { IInjectMetadataCollector } from '../../features/ioc/IInjectMetadataCollector';

export type InjectFnDecorator = <T>(injectionFn: InjectFn<T>) => ParameterDecorator;
export function createInjectFnDecorator(metadata: IInjectMetadataCollector): InjectFnDecorator {
    return (injectionFn) => (target, propertyKey, parameterIndex) => {
        metadata.addMetadata(target, parameterIndex, injectionFn);
    };
}

type InjectDecorator = <T>(token: InjectionToken<T>, ...args: any[]) => ParameterDecorator;
export function createInjectDecorator(metadata: IInjectMetadataCollector): InjectDecorator {
    const decorator = createInjectFnDecorator(metadata);
    return <T>(token: InjectionToken<T>, ...args: any[]) => decorator((l) => l.resolve(token, ...args));
}
