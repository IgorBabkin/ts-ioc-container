#!/usr/bin/env bun

import { readFileSync } from 'node:fs';
import { COMPARISON_THRESHOLDS } from './config';

interface Metric {
  avg: number;
  avgError: number;
  med: number;
  medError: number;
  unit: string;
}

interface BenchmarkResult {
  id: string;
  name: string;
  latency: Metric;
  throughput: Metric;
  samples: number;
}

interface ComparisonResult {
  id: string;
  name: string;
  latencyAvgDiffPercent: number;
  latencyMedDiffPercent: number;
  throughputAvgDiffPercent: number;
  throughputMedDiffPercent: number;
  exceedsThreshold: boolean;
  failures: string[];
}

/**
 * Parse command line arguments for the benchmark comparison tool
 */
function parseArgs(): { leftPath: string; rightPath: string } {
  const args = process.argv.slice(2);
  const leftIndex = args.indexOf('--left');
  const rightIndex = args.indexOf('--right');

  if (leftIndex === -1 || rightIndex === -1) {
    console.error('Error: Both --left and --right parameters are required.');
    console.error('Usage: ./compare-reports.ts --left <left_report_path> --right <right_report_path>');
    process.exit(1);
  }

  const leftPath = args[leftIndex + 1];
  const rightPath = args[rightIndex + 1];

  if (!leftPath || !rightPath) {
    console.error('Error: Report file paths must be provided for both --left and --right.');
    console.error('Usage: ./compare-reports.ts --left <left_report_path> --right <right_report_path>');
    process.exit(1);
  }

  return { leftPath, rightPath };
}

/**
 * Load and parse a benchmark report file
 */
function loadReport(filePath: string): BenchmarkResult[] {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading report file ${filePath}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Calculate percentage change between two values
 * Positive percentage = increase, Negative percentage = decrease
 */
function calculatePercentageChange(oldValue: number, newValue: number): number {
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Compare two benchmark reports and identify performance regressions
 */
function compareReports(baseline: BenchmarkResult[], comparison: BenchmarkResult[]): ComparisonResult[] {
  const baselineMap = new Map<string, BenchmarkResult>();

  for (const result of baseline) {
    baselineMap.set(result.id, result);
  }

  return comparison.map((compResult) => {
    const baseResult = baselineMap.get(compResult.id);

    // If this benchmark doesn't exist in the baseline, we can't compare
    if (!baseResult) {
      return {
        id: compResult.id,
        name: compResult.name,
        latencyAvgDiffPercent: 0,
        latencyMedDiffPercent: 0,
        throughputAvgDiffPercent: 0,
        throughputMedDiffPercent: 0,
        exceedsThreshold: false,
        failures: [`Benchmark '${compResult.name}' not found in baseline report`],
      };
    }

    // Calculate percentage differences
    const latencyAvgDiffPercent = calculatePercentageChange(baseResult.latency.avg, compResult.latency.avg);
    const latencyMedDiffPercent = calculatePercentageChange(baseResult.latency.med, compResult.latency.med);
    const throughputAvgDiffPercent = calculatePercentageChange(baseResult.throughput.avg, compResult.throughput.avg);
    const throughputMedDiffPercent = calculatePercentageChange(baseResult.throughput.med, compResult.throughput.med);

    // Check for threshold violations
    const failures: string[] = [];
    let exceedsThreshold = false;

    if (COMPARISON_THRESHOLDS.compareAvg) {
      if (latencyAvgDiffPercent > COMPARISON_THRESHOLDS.maxLatencyIncreasePercent) {
        failures.push(
          `Average latency increased by ${latencyAvgDiffPercent.toFixed(2)}% (threshold: ${COMPARISON_THRESHOLDS.maxLatencyIncreasePercent}%)`,
        );
        exceedsThreshold = true;
      }

      if (throughputAvgDiffPercent < -COMPARISON_THRESHOLDS.maxThroughputDecreasePercent) {
        failures.push(
          `Average throughput decreased by ${Math.abs(throughputAvgDiffPercent).toFixed(2)}% (threshold: ${COMPARISON_THRESHOLDS.maxThroughputDecreasePercent}%)`,
        );
        exceedsThreshold = true;
      }
    }

    if (COMPARISON_THRESHOLDS.compareMed) {
      if (latencyMedDiffPercent > COMPARISON_THRESHOLDS.maxLatencyIncreasePercent) {
        failures.push(
          `Median latency increased by ${latencyMedDiffPercent.toFixed(2)}% (threshold: ${COMPARISON_THRESHOLDS.maxLatencyIncreasePercent}%)`,
        );
        exceedsThreshold = true;
      }

      if (throughputMedDiffPercent < -COMPARISON_THRESHOLDS.maxThroughputDecreasePercent) {
        failures.push(
          `Median throughput decreased by ${Math.abs(throughputMedDiffPercent).toFixed(2)}% (threshold: ${COMPARISON_THRESHOLDS.maxThroughputDecreasePercent}%)`,
        );
        exceedsThreshold = true;
      }
    }

    return {
      id: compResult.id,
      name: compResult.name,
      latencyAvgDiffPercent,
      latencyMedDiffPercent,
      throughputAvgDiffPercent,
      throughputMedDiffPercent,
      exceedsThreshold,
      failures,
    };
  });
}

/**
 * Helper function to format percentage values with colors and symbols
 */
function formatPercentage(value: number, isLatency: boolean): string {
  const formattedValue = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const threshold = isLatency
    ? COMPARISON_THRESHOLDS.maxLatencyIncreasePercent
    : COMPARISON_THRESHOLDS.maxThroughputDecreasePercent;

  if (isLatency) {
    // For latency, increases (positive values) are bad
    if (value > threshold) {
      return `❌ ${formattedValue}`;
    }
    if (value > 0) {
      return `⚠️ ${formattedValue}`;
    }
    return `✅ ${formattedValue}`;
  }

  // For throughput, decreases (negative values) are bad
  if (value < -threshold) {
    return `❌ ${formattedValue}`;
  }
  if (value < 0) {
    return `⚠️ ${formattedValue}`;
  }
  return `✅ ${formattedValue}`;
}

/**
 * Helper function to pad a string to a specific length
 */
function padString(str: string, length: number): string {
  return str.length >= length ? str : `${str}${' '.repeat(length - str.length)}`;
}

/**
 * Format and display the comparison results as a table
 */
function displayResults(results: ComparisonResult[]): boolean {
  let hasFailures = false;

  console.log('\nBenchmark Comparison Results:');
  console.log('=============================\n');

  // Define column widths for the table
  const nameWidth = Math.max(...results.map((r) => r.name.length), 30);
  const idWidth = Math.max(...results.map((r) => r.id.length), 15);
  const metricWidth = 20;

  // Print table header
  console.log(
    `${padString('Benchmark', nameWidth)} | ${padString('ID', idWidth)} | ${padString('Latency Avg', metricWidth)} | ${padString('Latency Med', metricWidth)} | ${padString('Throughput Avg', metricWidth)} | ${padString('Throughput Med', metricWidth)}`,
  );

  // Print separator
  console.log(
    `${'-'.repeat(nameWidth)}-+-${'-'.repeat(idWidth)}-+-${'-'.repeat(metricWidth)}-+-${'-'.repeat(metricWidth)}-+-${'-'.repeat(metricWidth)}-+-${'-'.repeat(metricWidth)}`,
  );

  // Print data rows
  for (const result of results) {
    console.log(
      `${padString(result.name, nameWidth)} | ${padString(result.id, idWidth)} | ${padString(formatPercentage(result.latencyAvgDiffPercent, true), metricWidth)} | ${padString(formatPercentage(result.latencyMedDiffPercent, true), metricWidth)} | ${padString(formatPercentage(result.throughputAvgDiffPercent, false), metricWidth)} | ${padString(formatPercentage(result.throughputMedDiffPercent, false), metricWidth)}`,
    );

    if (result.exceedsThreshold) {
      hasFailures = true;
    }
  }

  console.log('\nFailure Details:');
  console.log('===============\n');

  let foundFailures = false;
  for (const result of results) {
    if (result.failures.length > 0) {
      foundFailures = true;
      console.log(`${result.name} (${result.id}):`);
      for (const failure of result.failures) {
        console.log(`  ❌ ${failure}`);
      }
      console.log('');
    }
  }

  if (!foundFailures) {
    console.log('✅ No failures detected\n');
  }

  // Display summary
  console.log('Summary:');
  console.log('========');
  if (hasFailures) {
    console.log('❌ Performance regression detected! Some benchmarks exceeded the thresholds.');
    console.log(`   Max allowed latency increase: ${COMPARISON_THRESHOLDS.maxLatencyIncreasePercent}%`);
    console.log(`   Max allowed throughput decrease: ${COMPARISON_THRESHOLDS.maxThroughputDecreasePercent}%`);
  } else {
    console.log('✅ All benchmarks are within acceptable thresholds.');
  }

  return hasFailures;
}

function main() {
  const { leftPath, rightPath } = parseArgs();
  console.log(`Comparing baseline report '${leftPath}' with comparison report '${rightPath}'`);

  const baselineReport = loadReport(leftPath);
  const comparisonReport = loadReport(rightPath);

  const results = compareReports(baselineReport, comparisonReport);
  const hasFailures = displayResults(results);

  if (hasFailures) {
    process.exit(1); // Exit with error code if threshold is exceeded
  } else {
    process.exit(0); // Exit with success code if all checks pass
  }
}

main();
