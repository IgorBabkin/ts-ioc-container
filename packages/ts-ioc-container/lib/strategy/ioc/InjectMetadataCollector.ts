import 'reflect-metadata';
import { InjectionToken } from './decorators';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';
import { constructor } from '../../helpers/types';
import { ArgsFn } from '../../provider/IProvider';

export const INJECTION_TOKEN_METADATA_KEY = 'injectionTokens';
export type InjectionItem<T> = {
    token: InjectionToken<T>;
    type: 'factory' | 'instance';
    argsFn: ArgsFn;
};

export class InjectMetadataCollector implements IInjectMetadataCollector {
    public injectMetadata(target: any, parameterIndex: number, injectionItem: InjectionItem<any>): void {
        const injectionTokens = Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || [];
        injectionTokens[parameterIndex] = injectionItem;
        Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, injectionTokens, target);
    }

    public getMetadata<T>(target: constructor<T>): InjectionItem<any>[] {
        return Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || [];
    }
}
