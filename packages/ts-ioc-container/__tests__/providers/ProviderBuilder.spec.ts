import { Container, fromFn, ServiceLocator, SimpleInjector } from '../../lib';

describe('ProviderBuilder', function () {
    let locator: Container;

    beforeEach(() => {
        locator = new Container(ServiceLocator.fromInjector(new SimpleInjector()));
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = fromFn((l, ...deps) => deps).withArgs(...args);

        expect(builder.build().resolve(locator)).toEqual(args);
    });
});
