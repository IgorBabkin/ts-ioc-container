import 'reflect-metadata';
import {
    AutoMockedContainer,
    by,
    constructor,
    Container,
    IContainer,
    IInjector,
    IMockRepository,
    Injector,
    ProviderKey,
} from '../lib';
import { inject, resolve } from 'ts-constructor-injector';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction, Times } from 'moq.ts';

export class IocInjector extends Injector {
    clone(): IInjector {
        return new IocInjector();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        return resolve(container)(value, ...args);
    }
}

const ILogsRepoKey = Symbol('ILogsRepo');

interface ILogsRepo {
    saveLogs(messages: string[]): void;
}

class Logger {
    private messages: string[] = [];
    constructor(@inject(by(ILogsRepoKey)) private logsRepo: ILogsRepo) {}

    log(message: string): void {
        this.messages.push(message);
    }

    save(): void {
        this.logsRepo.saveLogs(this.messages);
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
        return this.mocks.get(key) as IMock<T>;
    }
}

describe('Automock', function () {
    let mockRepo: MoqRepository;
    let logsRepoMock: IMock<ILogsRepo>;

    beforeEach(function () {
        mockRepo = new MoqRepository();
        logsRepoMock = mockRepo.resolveMock(ILogsRepoKey);
    });

    function createContainer() {
        return new Container(new IocInjector()).map((c) => new AutoMockedContainer(c, mockRepo));
    }

    it('should automock all non defined dependencies', async function () {
        const container = createContainer();

        const logger = container.resolve(Logger);
        logger.log('hello');
        logger.save();

        logsRepoMock.verify((x) => x.saveLogs(It.IsAny()), Times.Once());
    });
});
