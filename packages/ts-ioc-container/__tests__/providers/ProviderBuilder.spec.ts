import { fromFn, IContainer, Container } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('ProviderBuilder', function () {
    let locator: IContainer;

    beforeEach(() => {
        locator = new Container(new SimpleInjector());
    });

    test('withArgs', () => {
        const args = [2, 3, 4];

        const builder = fromFn((l, ...deps) => deps).withArgs(...args);
        locator.register(builder.forKey('hey').build());

        expect(locator.resolve('hey')).toEqual(args);
    });
});
