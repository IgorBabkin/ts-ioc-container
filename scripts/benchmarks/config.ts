import { BenchOptions } from 'tinybench';

export const BENCHMARK_CONFIG: Partial<BenchOptions> = {
  iterations: 10,
  warmup: true,
  warmupIterations: 5,
};
