import { DIContainer, ProviderBuilder, ServiceLocator, SimpleInjector } from '../../lib';
import { DIProviderBuilder } from '../../lib/core/DIProviderBuilder';

describe('ProviderBuilder', function () {
    let locator: DIContainer;

    beforeEach(() => {
        locator = new DIContainer(ServiceLocator.fromInjector(new SimpleInjector()), new DIProviderBuilder());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = ProviderBuilder.fromFn((l, ...deps) => deps).withArgs(...args);

        expect(builder.build().resolve(locator)).toEqual(args);
    });
});
