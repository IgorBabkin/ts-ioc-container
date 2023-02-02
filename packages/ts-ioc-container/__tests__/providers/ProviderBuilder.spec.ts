import { fromFn, IServiceLocator, ServiceLocator } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('ProviderBuilder', function () {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new SimpleInjector());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = fromFn((l, ...deps) => deps).withArgs(...args);
        locator.register(builder.forKey('hey').build());

        expect(locator.resolve('hey')).toEqual(args);
    });
});
