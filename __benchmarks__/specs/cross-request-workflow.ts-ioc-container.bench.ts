import { bench, describe } from 'vitest';
import { benchmarkSpec } from './cross-request-workflow.ts-ioc-container.benchmark';

describe('Benchmark: cross request workflow spec - ts-ioc-container', () => {
  bench(benchmarkSpec.taskName, benchmarkSpec.createTask());
});
