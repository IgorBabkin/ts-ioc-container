import { bench, describe } from 'vitest';
import { benchmarkSpec } from './dependency-registration.tsyringe.benchmark';

describe('Benchmark: dependency registration spec - tsyringe', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
