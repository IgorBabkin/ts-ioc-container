import 'reflect-metadata';
import {
  AutoMockedContainer,
  by,
  Container,
  DependencyKey,
  inject,
  MetadataInjector,
  MethodNotImplementedError,
} from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction, Times } from 'moq.ts';

const ILogsRepoKey = Symbol('ILogsRepo');

interface ILogsRepo {
  saveLogs(messages: string[]): void;
}

class Logger {
  private messages: string[] = [];

  constructor(@inject(by.key(ILogsRepoKey)) private logsRepo: ILogsRepo) {}

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

export class MoqContainer extends AutoMockedContainer {
  private mocks = new Map<DependencyKey, IMock<any>>();

  resolve<T>(key: DependencyKey): T {
    return this.resolveMock<T>(key).object();
  }

  resolveMock<T>(key: DependencyKey): IMock<T> {
    if (!this.mocks.has(key)) {
      this.mocks.set(key, createMock());
    }
    return this.mocks.get(key) as IMock<T>;
  }
}

describe('Automock', function () {
  let mockContainer: MoqContainer;
  let logsRepoMock: IMock<ILogsRepo>;

  beforeEach(function () {
    mockContainer = new MoqContainer();
    logsRepoMock = mockContainer.resolveMock(ILogsRepoKey);
  });

  function createContainer() {
    return new Container(new MetadataInjector(), { parent: mockContainer });
  }

  it('should automock all non defined dependencies', async function () {
    const container = createContainer();

    const logger = container.resolve(Logger);
    logger.log('hello');
    logger.save();

    logsRepoMock.verify((x) => x.saveLogs(It.IsAny()), Times.Once());
  });

  it('should not throw an error on dispose', function () {
    const container = createContainer();
    expect(() => container.dispose()).not.toThrowError();
  });

  it('should raise an error when try to create a scope', () => {
    expect(() => mockContainer.createScope()).toThrowError(MethodNotImplementedError);
  });

  it('should return empty list of instances', function () {
    expect(mockContainer.getInstances()).toEqual([]);
  });
});
