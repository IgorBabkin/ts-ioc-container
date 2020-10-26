![npm bundle size](https://img.shields.io/bundlephobia/minzip/unit-test-ts-ioc-container)

# UnitTest TS IoContainer
## Advantages
- simple (it's just decorator for `IServiceLocator` from [ts-ioc-container](https://github.com/IgorBabkin/service-locator/tree/master/packages/ts-ioc-container))
- clean API
- flexible (you can use any mocking engine just need to implement `IMockAdapter`)
- auto-mocking
- provides `MoqAdapter` to support [moq.ts](https://www.npmjs.com/package/moq.ts)

```typescript
import {Mock} from 'moq.ts';
import {ServiceLocatorFactory} from 'ts-ioc-container';
import {UnitTestServiceLocatorFactory, MoqAdapter, MoqAdapter} from 'unit-test-ts-ioc-container';

const container = new ServiceLocatorFactory().createIoCLocator();
const mockFactory = () => new MoqAdapter(new Mock());
const unitTestContainer = new UnitTestServiceLocatorFactory(mockFactory).create(container);

const stickerMock = unitTestContainer.resolveMock('ISticker');
stickerMock.setup(i => i.title).return('Sticker title');
```
