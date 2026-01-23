#!/usr/bin/env ts-node
/**
 * Run all benchmarks sequentially
 *
 * This script executes all benchmark suites in sequence to avoid
 * interference between different benchmarks.
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const benchmarkDir = __dirname;
const benchmarkFiles = readdirSync(benchmarkDir).filter(
  (file) => file.endsWith('.benchmark.ts') && file !== 'run-all.ts',
);

console.log(`\n${'='.repeat(80)}`);
console.log('Running Performance Benchmarks: ts-ioc-container vs tsyringe');
console.log('='.repeat(80));
console.log(`\nFound ${benchmarkFiles.length} benchmark suites:\n`);

benchmarkFiles.forEach((file, index) => {
  const benchmarkName = file.replace('.benchmark.ts', '');
  console.log(`  ${index + 1}. ${benchmarkName}`);
});

console.log(`\n${'='.repeat(80)}\n`);

benchmarkFiles.forEach((file, index) => {
  const benchmarkPath = join(benchmarkDir, file);
  const benchmarkName = file.replace('.benchmark.ts', '');

  console.log(`\n[${index + 1}/${benchmarkFiles.length}] Running: ${benchmarkName}`);
  console.log('-'.repeat(80));

  try {
    execSync(`ts-node "${benchmarkPath}"`, {
      stdio: 'inherit',
      cwd: join(benchmarkDir, '..'),
    });
  } catch (error) {
    console.error(`\n❌ Failed to run ${benchmarkName}:`, error);
    process.exit(1);
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log('✅ All benchmarks completed successfully!');
console.log('='.repeat(80));
console.log('\nResults saved to:');
console.log('  - JSON: benchmark/results/*.json');
console.log('  - HTML Charts: benchmark/results/*.html');
console.log('='.repeat(80));
console.log('\n');
