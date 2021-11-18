import { DIContainer, ProviderBuilder, ServiceLocator, SimpleInjector } from '../../lib';

describe('ProviderBuilder', function () {
    let locator: DIContainer;

    beforeEach(() => {
        locator = new DIContainer(ServiceLocator.fromInjector(new SimpleInjector()));
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = ProviderBuilder.fromFn((l, ...deps) => deps).withArgs(...args);

        expect(builder.build().resolve(locator)).toEqual(args);
    });
});
