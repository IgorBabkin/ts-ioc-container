import { bench, describe } from 'vitest';
import { benchmarkSpec } from './scoped-lifecycle.ts-ioc-container.benchmark';

describe('Benchmark: scoped lifecycle spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
