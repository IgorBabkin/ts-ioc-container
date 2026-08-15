import { bench, describe } from 'vitest';
import { benchmarkSpec } from './token-based-injection.ts-ioc-container.benchmark';

describe('Benchmark: token-based injection spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
