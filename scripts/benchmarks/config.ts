import { BenchOptions } from 'tinybench';

export const BENCHMARK_CONFIG: Partial<BenchOptions> = {
  iterations: 10,
  warmup: true,
  warmupIterations: 5,
};

export const COMPARISON_THRESHOLDS = {
  // Maximum allowed percentage increase in latency (higher latency is worse)
  maxLatencyIncreasePercent: 20,

  // Maximum allowed percentage decrease in throughput (lower throughput is worse)
  maxThroughputDecreasePercent: 20,

  // Whether to check average or median values (or both)
  compareAvg: true,
  compareMed: false,
};
