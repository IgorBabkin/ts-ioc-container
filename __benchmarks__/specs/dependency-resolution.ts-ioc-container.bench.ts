import { bench, describe } from 'vitest';
import { benchmarkSpec } from './dependency-resolution.ts-ioc-container.benchmark';

describe('Benchmark: dependency resolution spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
