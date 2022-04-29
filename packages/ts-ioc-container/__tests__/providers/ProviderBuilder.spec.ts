import { Container, fromFn } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('ProviderBuilder', function () {
    let locator: Container;

    beforeEach(() => {
        locator = Container.fromInjector(new SimpleInjector());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = fromFn((l, ...deps) => deps).withArgs(...args);
        locator.register(builder.forKeys('hey').build());

        expect(locator.resolve('hey')).toEqual(args);
    });
});
