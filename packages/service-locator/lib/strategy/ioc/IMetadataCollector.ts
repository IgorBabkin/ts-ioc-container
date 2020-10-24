import { constructor } from '../../IServiceLocator';
import { InjectionItem } from './MetadataCollector';

export interface IMetadataCollector {
    injectMetadata(target: any, parameterIndex: number, injectionItem: InjectionItem<any>): void;

    getMetadata<T>(target: constructor<T>): InjectionItem<any>[];
}
