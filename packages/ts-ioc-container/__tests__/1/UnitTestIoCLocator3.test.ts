import 'reflect-metadata';
import {
    createLevelDecorator,
    createProviderDecorator,
    createSingletonDecorator,
    createTagsDecorator,
    LevelProvider,
    Provider,
    ProvidersMetadataCollector,
} from '../../lib';

const metadataCollector = new ProvidersMetadataCollector();

const provider = createProviderDecorator(metadataCollector);
const singleton = createSingletonDecorator(metadataCollector);
const level = createLevelDecorator(metadataCollector);
const tags = createTagsDecorator(metadataCollector);

@provider('key1')
class Greeting {
    constructor() {}

    hello() {
        return 'Hello, world!';
    }
}

@level(1)
@provider('key2')
class Greeting2 {
    constructor() {}

    hello() {
        return 'Hello, world!';
    }
}

describe('UnitTestIoCLocator', () => {
    it('ioc', () => {
        const providers = metadataCollector.getProviders();
        expect(providers['key1']).toBeInstanceOf(Provider);
    });

    it('ioc2', () => {
        const providers = metadataCollector.getProviders();
        expect(providers['key2']).toBeInstanceOf(LevelProvider);
    });
});
