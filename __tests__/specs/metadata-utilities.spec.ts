import 'reflect-metadata';
import { afterEach, beforeEach, vi } from 'vitest';
import {
  classLabel,
  classTag,
  debounce,
  getClassLabels,
  getClassTags,
  getMethodLabels,
  getMethodTags,
  getParamLabels,
  getParamTags,
  handleAsyncError,
  handleError,
  methodLabel,
  methodTag,
  once,
  paramLabel,
  paramTag,
  shallowCache,
  throttle,
} from '../../lib';

describe('Spec: metadata utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('attaches class, parameter, and method labels and tags without bleeding between targets', () => {
    @classLabel('role', 'service')
    @classTag('domain')
    class ClassAnnotated {}

    class ParamAnnotated {
      constructor(@paramLabel('source', 'request') @paramTag('tenant') tenantId: string) {}
    }

    class MethodAnnotated {
      run(): void {}

      @methodLabel('phase', 'startup')
      @methodTag('lifecycle')
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

      @once
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
