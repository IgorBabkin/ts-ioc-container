#!/usr/bin/env node

/**
 * This script checks that test coverage doesn't drop below the baseline.
 * It's used in the lint-staged configuration to prevent commits that would reduce test coverage.
 * The thresholds are stored in a JSON file and updated by the post-commit hook.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Define coverage summary interface
interface CoverageSummary {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
}

// Define coverage threshold interface
interface CoverageThreshold {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

// Path to the thresholds JSON file
const thresholdsPath = path.join(__dirname, 'coverage-thresholds.json');

/**
 * Main function to check coverage
 */
function checkCoverage(): number {
  try {
    // Read current thresholds
    const COVERAGE_THRESHOLD = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8')) as CoverageThreshold;

    // Run tests with coverage
    execSync('npx jest --coverage --coverageReporters=json-summary', { stdio: 'inherit' });

    // Read the coverage summary
    const coverageSummaryPath = path.join(__dirname, '..', 'coverage/coverage-summary.json');
    const coverageSummary: CoverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

    const total = coverageSummary.total;

    // Check if coverage is below thresholds
    const failures: string[] = [];

    if (total.statements.pct < COVERAGE_THRESHOLD.statements) {
      failures.push(`Statements coverage dropped: ${total.statements.pct}% < ${COVERAGE_THRESHOLD.statements}%`);
    }

    if (total.branches.pct < COVERAGE_THRESHOLD.branches) {
      failures.push(`Branches coverage dropped: ${total.branches.pct}% < ${COVERAGE_THRESHOLD.branches}%`);
    }

    if (total.functions.pct < COVERAGE_THRESHOLD.functions) {
      failures.push(`Functions coverage dropped: ${total.functions.pct}% < ${COVERAGE_THRESHOLD.functions}%`);
    }

    if (total.lines.pct < COVERAGE_THRESHOLD.lines) {
      failures.push(`Lines coverage dropped: ${total.lines.pct}% < ${COVERAGE_THRESHOLD.lines}%`);
    }

    if (failures.length > 0) {
      console.error('❌ Test coverage has decreased:');
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      console.error('\nPlease add tests to maintain or improve the current coverage levels.');
      return 1;
    }

    console.log('✅ Test coverage is maintained or improved!');
    return 0;
  } catch (error) {
    console.error('Error running coverage check:', (error as Error).message);
    return 1;
  }
}

// Run the check and exit with the appropriate code
const exitCode = checkCoverage();
if (exitCode !== 0) {
  process.exit(exitCode);
}
