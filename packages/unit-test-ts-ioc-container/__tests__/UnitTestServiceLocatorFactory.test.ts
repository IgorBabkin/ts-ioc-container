import { ServiceLocatorFactory } from 'ts-ioc-container';
import { IUnitTestServiceLocator, MoqAdapter, UnitTestServiceLocatorFactory } from '../lib';
import { Mock } from 'moq.ts';

describe('UnitTestServiceLocatorFactory', () => {
    function createLocator(): IUnitTestServiceLocator<Mock<any>> {
        return new UnitTestServiceLocatorFactory(() => new MoqAdapter(new Mock())).create(
            new ServiceLocatorFactory().createSimpleLocator(),
        );
    }

    it('', () => {
        const locator = createLocator();

        locator
            .resolveMock('key1')
            .setup((i) => i.greeting())
            .returns(1);

        const key1 = locator.resolve<any>('key1');

        expect(key1.greeting()).toBe(1);
    });
});
