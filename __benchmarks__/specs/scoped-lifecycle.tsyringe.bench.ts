import { bench, describe } from 'vitest';
import { benchmarkSpec } from './scoped-lifecycle.tsyringe.benchmark';

describe('Benchmark: scoped lifecycle spec - tsyringe', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
