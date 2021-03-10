import { InjectionItem } from './InjectMetadataCollector';
import { constructor } from '../../helpers/types';

export interface IInjectMetadataCollector {
    addMetadata(target: any, parameterIndex: number, injectionItem: InjectionItem<any>): void;

    getMetadata<T>(target: constructor<T>): InjectionItem<any>[];
}
