import { constructor } from '../../helpers/types';
import { Tag } from '../../core/IProvider';
import { SingletonProvider } from './SingletonProvider';
import { LevelProvider } from './LevelProvider';
import { TaggedProvider } from './TaggedProvider';
import { IProvidersMetadataCollector } from './IProvidersMetadataCollector';

export const createSingletonDecorator =
    (metadataCollector: IProvidersMetadataCollector): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (provider) => new SingletonProvider(fn(provider)));
    };

export const createLevelDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (value: number): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (provider) => new LevelProvider(fn(provider), [value, value]));
    };

export const createTagsDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (provider) => new TaggedProvider(fn(provider), tags));
    };
