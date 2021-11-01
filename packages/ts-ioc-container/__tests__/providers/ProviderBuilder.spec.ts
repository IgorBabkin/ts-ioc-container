import { IServiceLocator, ProviderBuilder, ServiceLocator, SimpleInjector } from '../../lib';

describe('ProviderBuilder', function () {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new SimpleInjector());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = ProviderBuilder.fromFn((l, ...deps) => deps).withArgs(...args);

        expect(builder.asRequested().resolve(locator)).toEqual(args);
    });
});
