import { IServiceLocator, ProviderBuilder, ProviderRepository, ServiceLocator, SimpleInjector } from '../../lib';

describe('ProviderBuilder', function () {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = new ProviderBuilder((l, ...deps) => deps).withArgs(...args);

        expect(builder.build().resolve(locator)).toEqual(args);
    });
});
