import { constructor } from '../../helpers/types';
import { ProviderKey, Tag } from '../../core/IProvider';
import { IProvidersMetadataCollector } from './IProvidersMetadataCollector';
import { SingletonProvider } from './SingletonProvider';
import { LevelProvider } from './LevelProvider';
import { TaggedProvider } from './TaggedProvider';

export const createProviderDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        metadataCollector.add(key, target as any as constructor<unknown>);
    };

export const createSingletonDecorator =
    (metadataCollector: IProvidersMetadataCollector): ClassDecorator =>
    (target) => {
        metadataCollector.update(target as any as constructor<unknown>, (provider) => new SingletonProvider(provider));
    };

export const createLevelDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (value: number): ClassDecorator =>
    (target) => {
        metadataCollector.update(
            target as any as constructor<unknown>,
            (provider) => new LevelProvider(provider, [value, value]),
        );
    };

export const createTagsDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (tags: Tag[]): ClassDecorator =>
    (target) => {
        metadataCollector.update(
            target as any as constructor<unknown>,
            (provider) => new TaggedProvider(provider, tags),
        );
    };
