#!/usr/bin/env node

/**
 * This script updates the coverage results based on the latest test run.
 * It's designed to be run as a post-commit hook to track improvements in test coverage.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

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
interface CoverageResults {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

// Path to the results JSON file
const resultsPath = path.join(__dirname, 'prev-coverage-result.json');
// Path to the coverage summary file
const coverageSummaryPath = path.join(__dirname, '..', 'coverage/coverage-summary.json');

// Read the coverage results from the JSON file
function readResults(): CoverageResults {
  try {
    return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch (error) {
    // Default results if file cannot be read
    throw new Error('Results file not found');
  }
}

// Save the coverage results to the JSON file
function saveResults(results: CoverageResults): void {
  try {
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log('Updated coverage results saved to:', resultsPath);
  } catch (error) {
    console.error('Error saving results file:', (error as Error).message);
  }
}

/**
 * Main function to update coverage thresholds
 */
function updateThresholds(): void {
  try {
    // Check if coverage summary exists
    if (!fs.existsSync(coverageSummaryPath)) {
      console.log('No coverage summary found. Skipping threshold update.');
      return;
    }

    // Read current thresholds
    const currentThresholds = readResults();

    // Read the coverage summary
    const coverageSummary: CoverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    const total = coverageSummary.total;

    // Update results with new values if they are higher
    const newResults: CoverageResults = {
      statements: total.statements.pct,
      branches: total.branches.pct,
      functions: total.functions.pct,
      lines: total.lines.pct,
    };

    // Check if results have changed
    const hasChanged =
      newResults.statements !== currentThresholds.statements ||
      newResults.branches !== currentThresholds.branches ||
      newResults.functions !== currentThresholds.functions ||
      newResults.lines !== currentThresholds.lines;

    if (hasChanged) {
      // Save the updated results
      saveResults(newResults);
      console.log('Coverage results have been updated:');
      console.log(`- Statements: ${currentThresholds.statements}% -> ${newResults.statements}%`);
      console.log(`- Branches: ${currentThresholds.branches}% -> ${newResults.branches}%`);
      console.log(`- Functions: ${currentThresholds.functions}% -> ${newResults.functions}%`);
      console.log(`- Lines: ${currentThresholds.lines}% -> ${newResults.lines}%`);
    } else {
      console.log('Coverage results remain unchanged.');
    }
  } catch (error) {
    console.error('Error updating coverage results:', (error as Error).message);
  }
}

// Run the update
updateThresholds();
