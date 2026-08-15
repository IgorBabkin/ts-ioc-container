import { bench, describe } from 'vitest';
import { benchmarkSpec } from './token-based-injection.tsyringe.benchmark';

describe('Benchmark: token-based injection spec - tsyringe', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
