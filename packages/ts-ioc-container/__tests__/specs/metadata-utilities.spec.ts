import 'reflect-metadata';
import { afterEach, beforeEach, vi } from 'vitest';
import { Mock, Times } from 'moq.ts';
import {
  addClassLabel,
  addClassTag,
  debounce,
  getClassLabels,
  getClassTags,
  getMethodLabels,
  getMethodTags,
  getParamLabels,
  getParamTags,
  handleAsyncError,
  handleError,
  addMethodLabel,
  addMethodTag,
  once,
  addParamLabel,
  addParamTag,
  shallowCache,
  throttle,
  TypedEvent,
  type TypedEventListener,
  TypedEventDisposedError,
} from '../../lib';

describe('Spec: metadata utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('attaches class, parameter, and method labels and tags without bleeding between targets', () => {
    @addClassLabel('role', 'service')
    @addClassTag('domain')
    class ClassAnnotated {}

    class ParamAnnotated {
      constructor(@addParamLabel('source', 'request') @addParamTag('tenant') tenantId: string) {}
    }

    class MethodAnnotated {
      run(): void {}

      @addMethodLabel('phase', 'startup')
      @addMethodTag('lifecycle')
      start(): void {}

      stop(): void {}
    }

    expect(getClassLabels(ClassAnnotated).get('role')).toBe('service');
    expect(getClassTags(new ClassAnnotated())).toContain('domain');
    expect(getParamLabels(ParamAnnotated, 0).get('source')).toBe('request');
    expect(getParamTags(ParamAnnotated, 0)).toContain('tenant');
    expect(getParamLabels(ParamAnnotated, 1).size).toBe(0);
    expect(getMethodLabels(MethodAnnotated, 'start').get('phase')).toBe('startup');
    expect(getMethodTags(MethodAnnotated, 'start')).toContain('lifecycle');
    expect(getMethodLabels(MethodAnnotated, 'stop').size).toBe(0);
  });

  it('adds reusable method behaviors for once, shallow cache, throttle, and debounce', () => {
    const calls: string[] = [];

    class Service {
      onceCount = 0;
      cacheCount = 0;

      @once()
      initialize(): number {
        this.onceCount += 1;
        return this.onceCount;
      }

      @shallowCache((id: unknown) => id)
      load(id: string): string {
        this.cacheCount += 1;
        return `${id}:${this.cacheCount}`;
      }

      @throttle(100)
      send(value: string): void {
        calls.push(value);
      }

      @debounce(100)
      schedule(value: string): void {
        calls.push(value);
      }
    }

    const service = new Service();

    expect(service.initialize()).toBe(1);
    expect(service.initialize()).toBe(1);
    expect(service.load('a')).toBe('a:1');
    expect(service.load('a')).toBe('a:1');
    expect(service.load('b')).toBe('b:2');

    service.send('first');
    service.send('blocked');
    vi.advanceTimersByTime(100);
    service.send('second');

    service.schedule('old');
    service.schedule('latest');
    vi.advanceTimersByTime(100);

    expect(calls).toEqual(['first', 'second', 'latest']);
  });

  it('publishes typed events to subscribers until they unsubscribe or the event is disposed', () => {
    const event = new TypedEvent<[string]>();
    const first = new Mock<TypedEventListener<[string]>>();
    const second = new Mock<TypedEventListener<[string]>>();

    const unsubscribeFirst = event.subscribe(first.object());
    event.subscribe(second.object());
    event.subscribe(second.object()); // a repeated subscription does not double-deliver

    event.emit('one');
    unsubscribeFirst();
    unsubscribeFirst(); // harmless when already detached
    event.emit('two');
    event.unsubscribe(second.object());
    event.unsubscribe(second.object()); // harmless when already detached
    event.emit('three');

    first.verify((l) => l('one'), Times.Once());
    first.verify((l) => l('two'), Times.Never());
    second.verify((l) => l('one'), Times.Once());
    second.verify((l) => l('two'), Times.Once());
    second.verify((l) => l('three'), Times.Never());

    event.dispose();

    expect(() => event.subscribe(first.object())).toThrowError(TypedEventDisposedError);
    expect(() => event.emit('four')).toThrowError(TypedEventDisposedError);
    expect(() => event.unsubscribe(first.object())).not.toThrow();
  });

  it('delivers an emission in subscription order and settles subscription changes made mid-emission', () => {
    const event = new TypedEvent<[number]>();
    const log: string[] = [];
    const late: TypedEventListener<[number]> = (n) => log.push(`late:${n}`);
    const second: TypedEventListener<[number]> = (n) => log.push(`second:${n}`);

    event.subscribe((n) => {
      log.push(`first:${n}`);
      event.unsubscribe(second);
      event.subscribe(late);
    });
    event.subscribe(second);

    event.emit(1);
    event.emit(2);

    expect(log).toEqual(['first:1', 'first:2', 'late:2']);
  });

  it('handles synchronous and asynchronous method errors with context', async () => {
    const handled: string[] = [];

    class Service {
      @handleError((error, context) => handled.push(`${context.target}.${context.method}:${String(error)}`))
      failSync(): void {
        throw 'sync';
      }

      @handleAsyncError((error, context) => handled.push(`${context.target}.${context.method}:${String(error)}`))
      async failAsync(): Promise<void> {
        throw 'async';
      }
    }

    const service = new Service();

    service.failSync();
    await service.failAsync();

    expect(handled).toEqual(['Service.failSync:sync', 'Service.failAsync:async']);
  });
});
