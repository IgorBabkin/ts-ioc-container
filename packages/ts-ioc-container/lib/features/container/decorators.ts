import { constructor } from '../../helpers/types';
import { ProviderKey, Tag } from '../../core/provider/IProvider';
import { IProvidersMetadataCollector } from './IProvidersMetadataCollector';
import { ArgsFn } from '../../core/provider/ArgsProvider';

export const createAddKeysDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forKey(key));
    };

export const createArgsFnDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (argsFn: ArgsFn): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).withArgsFn(argsFn));
    };

export const createSingletonDecorator =
    (metadataCollector: IProvidersMetadataCollector): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).asSingleton());
    };

export const createLevelDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (value: number): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forLevel(value));
    };

export const createTagsDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forTags(...tags));
    };
