import 'reflect-metadata';
import {
  AutoMockedContainer,
  by,
  Container,
  DependencyKey,
  inject,
  IRegistration,
  MetadataInjector,
  MethodNotImplementedError,
  DependencyNotFoundError,
} from '../lib';
import { IMock, It, Times } from 'moq.ts';
import { createMock } from './utils';

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

  it('should return false from hasProvider', function () {
    expect(mockContainer.hasProvider('someKey')).toBe(false);
  });

  it('should return undefined from getParent', function () {
    expect(mockContainer.getParent()).toBeUndefined();
  });

  it('should return empty array from getScopes', function () {
    expect(mockContainer.getScopes()).toEqual([]);
  });

  it('should return false from hasTag', function () {
    expect(mockContainer.hasTag('someTag')).toBe(false);
  });

  it('should not throw from detach', function () {
    expect(() => mockContainer.detach()).not.toThrow();
  });

  it('should not throw from dispose', function () {
    expect(() => mockContainer.dispose()).not.toThrow();
  });

  it('should not throw from removeScope', function () {
    expect(() => mockContainer.removeScope()).not.toThrow();
  });

  it('should return itself from register', function () {
    expect(mockContainer.register()).toBe(mockContainer);
  });

  it('should return itself from use', function () {
    expect(mockContainer.use()).toBe(mockContainer);
  });

  it('should return empty array from getRegistrations', function () {
    expect(mockContainer.getRegistrations()).toEqual([]);
  });

  it('should return itself from add', function () {
    const mockRegistration = {} as IRegistration;
    expect(mockContainer.add(mockRegistration)).toBe(mockContainer);
  });

  it('should return empty map from resolveManyByAlias', function () {
    const result = mockContainer.resolveManyByAlias(() => true);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should throw DependencyNotFoundError from resolveOneByAlias', function () {
    expect(() => mockContainer.resolveOneByAlias(() => true)).toThrow(DependencyNotFoundError);
  });
});
