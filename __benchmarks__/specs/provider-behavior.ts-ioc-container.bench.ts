import { bench, describe } from 'vitest';
import { benchmarkSpec } from './provider-behavior.ts-ioc-container.benchmark';

describe('Benchmark: provider behavior spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
