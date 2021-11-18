import {
    InjectionToken,
    IServiceLocator,
    MethodNotImplementedError,
    ProviderKey,
    ProviderNotFoundError,
    ServiceLocatorDecorator,
} from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

export class MoqServiceLocator extends ServiceLocatorDecorator {
    private mocks = new Map<ProviderKey, IMock<any>>();

    constructor(private locator: IServiceLocator) {
        super(locator);
    }

    createScope(): IServiceLocator {
        throw new MethodNotImplementedError();
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        try {
            return this.locator.resolve(key, ...args);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.resolveMock<T>(key as ProviderKey).object();
            }

            throw e;
        }
    }

    resolveMock<T>(key: ProviderKey): IMock<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, createMock<T>());
        }
        return this.mocks.get(key);
    }
}

export function createMock<T>(): IMock<T> {
    const mock = new Mock<T>()
        .setup(() => It.IsAny())
        .callback((interaction) => {
            const source: { __map: any } = mock as any;
            source.__map = source.__map || {};
            if (interaction instanceof GetPropertyInteraction) {
                if (source.__map[interaction.name] === undefined) {
                    source.__map[interaction.name] = (...args: any[]) => {
                        mock.tracker.add(new NamedMethodInteraction(interaction.name, args));
                    };
                }
                return source.__map[interaction.name];
            }
            if (interaction instanceof SetPropertyInteraction) {
                return true;
            }
        });
    return mock;
}
