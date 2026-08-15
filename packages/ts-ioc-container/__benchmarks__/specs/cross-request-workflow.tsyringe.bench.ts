import { bench, describe } from 'vitest';
import { benchmarkSpec } from './cross-request-workflow.tsyringe.benchmark';

describe('Benchmark: cross request workflow spec - tsyringe', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
