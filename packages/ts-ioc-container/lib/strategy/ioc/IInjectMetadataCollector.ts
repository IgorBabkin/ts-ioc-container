import { InjectionItem } from './InjectMetadataCollector';
import { constructor } from '../../types';

export interface IInjectMetadataCollector {
    injectMetadata(target: any, parameterIndex: number, injectionItem: InjectionItem<any>): void;

    getMetadata<T>(target: constructor<T>): InjectionItem<any>[];
}
