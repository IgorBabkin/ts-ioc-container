import { bench, describe } from 'vitest';
import { benchmarkSpec } from './dependency-resolution.tsyringe.benchmark';

describe('Benchmark: dependency resolution spec - tsyringe', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
