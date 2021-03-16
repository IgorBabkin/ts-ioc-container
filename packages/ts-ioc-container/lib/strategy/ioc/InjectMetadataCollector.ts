import 'reflect-metadata';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';
import { constructor } from '../../helpers/types';
import { ArgsFn } from '../../provider/IProvider';
import { InjectionToken } from '../../IServiceLocator';

export const INJECTION_TOKEN_METADATA_KEY = 'injectionTokens';
export type InjectionItem<T> = {
    token: InjectionToken<T>;
    type: 'factory' | 'instance';
    argsFn: ArgsFn;
};

export class InjectMetadataCollector implements IInjectMetadataCollector {
    addMetadata(target: unknown, parameterIndex: number, injectionItem: InjectionItem<any>): void {
        const injectionTokens = Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || [];
        injectionTokens[parameterIndex] = injectionItem;
        Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, injectionTokens, target);
    }

    getMetadata<T>(target: constructor<T>): InjectionItem<any>[] {
        return Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || [];
    }
}
