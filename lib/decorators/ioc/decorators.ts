import { InjectFn } from '../../features/ioc/InjectFn';
import { InjectionToken } from '../../core/IServiceLocator';
import { IInjectMetadataCollector } from '../../features/ioc/IInjectMetadataCollector';

export type InjectFnDecorator = <T>(injectionFn: InjectFn<T>) => ParameterDecorator;
export type InjectDecorator = <T>(token: InjectionToken<T> | [InjectionToken], ...args: any[]) => ParameterDecorator;

export function createInjectFnDecorator(metadata: IInjectMetadataCollector): InjectFnDecorator {
    return (injectionFn) => (target, propertyKey, parameterIndex) => {
        metadata.addMetadata(target, parameterIndex, injectionFn);
    };
}

export function createInjectDecorator(metadata: IInjectMetadataCollector): InjectDecorator {
    const decorator = createInjectFnDecorator(metadata);
    return (token, ...args) =>
        decorator(
            token instanceof Array
                ? (((l) => token.map((t) => l.resolve(t, ...args))) as InjectFn<any>)
                : (l) => l.resolve(token, ...args),
        );
}
