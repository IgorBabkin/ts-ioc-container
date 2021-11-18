/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    IDisposable,
    InjectionToken,
    IServiceLocator,
    MethodNotImplementedError,
    ProviderKey,
    ProviderNotFoundError,
    ServiceLocatorDecorator,
} from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

interface IMockRepository extends IDisposable {
    resolve<T>(key: InjectionToken<T>): T;
}

export class MockedServiceLocator extends ServiceLocatorDecorator {
    constructor(private locator: IServiceLocator, private mockRepository: IMockRepository) {
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
                return this.mockRepository.resolve<T>(key);
            }

            throw e;
        }
    }

    dispose(): void {
        this.mockRepository.dispose();
    }
}

export class MoqRepository implements IMockRepository {
    private mocks = new Map<ProviderKey, IMock<any>>();

    resolve<T>(key: ProviderKey): T {
        return this.resolveMock<T>(key).object();
    }

    dispose(): void {
        this.mocks.clear();
    }

    resolveMock<T>(key: ProviderKey): IMock<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, createMock());
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
