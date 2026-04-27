import { bench, describe } from 'vitest';
import { benchmarkSpec } from './dependency-registration.ts-ioc-container.benchmark';

describe('Benchmark: dependency registration spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
