import { ProviderRepo } from '../lib/core/provider/ProviderRepo';
import { Provider } from '../lib';
import { EmptyContainer } from '../lib/core/container/EmptyContainer';

describe('ProviderRepo', function () {
    it('should override parent providers', function () {
        const container = new EmptyContainer();
        const childrenProviders = new ProviderRepo().add(Provider.fromValue('child').setKey('a'));
        const parentProviders = [Provider.fromValue('parent').setKey('a')];

        const [actual] = childrenProviders.merge(parentProviders);

        expect(actual.resolve(container)).toBe('child');
    });
});
