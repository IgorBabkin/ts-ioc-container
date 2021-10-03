import { NamedProvider, Provider, ProviderRepository, ServiceLocator, SimpleInjector } from '../lib';
import { ProviderMismatchNameError } from '../lib/errors/ProviderMismatchNameError';

describe('NamedServiceLocator', function () {
    it('should name', function () {
        const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());

        locator.register('hey', new NamedProvider(new Provider(() => Math.random()), 'component'));

        expect(() => locator.resolve('hey')).toThrow(ProviderMismatchNameError);
    });
    it('should not name', function () {
        const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());

        locator.register('hey', new NamedProvider(new Provider(() => Math.random()), 'component'));

        expect(() => locator.resolve('hey')).toThrow(ProviderMismatchNameError);
    });
});
