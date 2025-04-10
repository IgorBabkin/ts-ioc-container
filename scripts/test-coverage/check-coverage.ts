#!/usr/bin/env bun

/**
 * This script checks that test coverage doesn't drop below the baseline.
 * It's used in the lint-staged configuration to prevent commits that would reduce test coverage.
 * The thresholds are stored in a JSON file and updated by the post-commit hook.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import prevCoverageResults from './prev-coverage-result.json';
import coverageConfig from './coverage-config.json';

// Define coverage summary interface
interface CoverageSummary {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
}

/**
 * Main function to check coverage
 */
function checkCoverage(): number {
  try {
    // Run tests with coverage
    execSync('npx jest --coverage --coverageReporters=json-summary', { stdio: 'inherit' });

    // Read the coverage summary
    const coverageSummaryPath = path.join(__dirname, '../..', 'coverage/coverage-summary.json');
    const coverageSummary: CoverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

    const total = coverageSummary.total;

    // Check if coverage is below thresholds
    const failures: string[] = [];

    if (prevCoverageResults.statements - total.statements.pct > coverageConfig.threshold.statements) {
      failures.push(`Statements coverage dropped more than ${coverageConfig.threshold.statements}%`);
    }

    if (prevCoverageResults.branches - total.branches.pct > coverageConfig.threshold.branches) {
      failures.push(`Branches coverage dropped more than ${coverageConfig.threshold.branches}%`);
    }

    if (prevCoverageResults.functions - total.functions.pct > coverageConfig.threshold.functions) {
      failures.push(`Functions coverage dropped more than ${coverageConfig.threshold.functions}%`);
    }

    if (prevCoverageResults.lines - total.lines.pct > coverageConfig.threshold.lines) {
      failures.push(`Lines coverage dropped more than ${coverageConfig.threshold.lines}%`);
    }

    if (failures.length > 0) {
      console.error('❌ Test coverage has decreased:');
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      console.error('\nPlease add tests to maintain or improve the current coverage levels.');
      return 1;
    }

    console.log('\n✅ Test coverage check passed! ✅');
    console.log('┌───────────────────────────────────────────┐');
    console.log('│                                           │');
    console.log('│   🎯 Coverage results remain strong! 🎯   │');
    console.log('│                                           │');
    console.log('└───────────────────────────────────────────┘');
    console.log('\nCurrent Coverage Metrics:');
    console.log(`  ✓ Statements: ${total.statements.pct.toFixed(2)}%`);
    console.log(`  ✓ Branches:   ${total.branches.pct.toFixed(2)}%`);
    console.log(`  ✓ Functions:  ${total.functions.pct.toFixed(2)}%`);
    console.log(`  ✓ Lines:      ${total.lines.pct.toFixed(2)}%`);
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
