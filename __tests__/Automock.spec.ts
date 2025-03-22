import 'reflect-metadata';
import {
  AutoMockedContainer,
  by,
  constructor,
  Container,
  DependencyKey,
  inject,
  MetadataInjector,
  MethodNotImplementedError,
} from '../lib';
import { IMock, It, Times } from 'moq.ts';
import { createMock } from './utils';
import { ResolveManyOptions, ResolveOneOptions } from '../lib/container/IContainer';

const ILogsRepoKey = Symbol('ILogsRepo');

interface ILogsRepo {
  saveLogs(messages: string[]): void;
}

class Logger {
  private messages: string[] = [];

  constructor(@inject(by.one(ILogsRepoKey)) private logsRepo: ILogsRepo) {}

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

  resolveByClass<T>(target: constructor<T>, options?: { args?: unknown[] }): T {
    throw new MethodNotImplementedError();
  }

  resolveOneByKey<T>(key: DependencyKey, options?: ResolveOneOptions): T {
    return this.resolveMock<T>(key).object();
  }

  resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[] {
    throw new MethodNotImplementedError();
  }

  resolveOneByAlias<T>(key: DependencyKey, options?: ResolveOneOptions): T {
    throw new MethodNotImplementedError();
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
    return new Container({ parent: mockContainer });
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
