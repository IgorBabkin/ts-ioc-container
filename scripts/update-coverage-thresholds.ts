#!/usr/bin/env node

/**
 * This script updates the coverage thresholds based on the latest test run.
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
interface CoverageThreshold {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

// Path to the thresholds JSON file
const thresholdsPath = path.join(__dirname, 'coverage-thresholds.json');
// Path to the coverage summary file
const coverageSummaryPath = path.join(__dirname, '..', 'coverage/coverage-summary.json');

// Read the coverage thresholds from the JSON file
function readThresholds(): CoverageThreshold {
  try {
    return JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
  } catch (error) {
    console.error('Error reading thresholds file:', (error as Error).message);
    // Default thresholds if file cannot be read
    return {
      statements: 98.32,
      branches: 88.52,
      functions: 92.85,
      lines: 99.02,
    };
  }
}

// Save the coverage thresholds to the JSON file
function saveThresholds(thresholds: CoverageThreshold): void {
  try {
    fs.writeFileSync(thresholdsPath, JSON.stringify(thresholds, null, 2), 'utf8');
    console.log('Updated coverage thresholds saved to:', thresholdsPath);
  } catch (error) {
    console.error('Error saving thresholds file:', (error as Error).message);
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
    const currentThresholds = readThresholds();

    // Read the coverage summary
    const coverageSummary: CoverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    const total = coverageSummary.total;

    // Update thresholds with new values if they are higher
    const newThresholds: CoverageThreshold = {
      statements: Math.max(currentThresholds.statements, total.statements.pct),
      branches: Math.max(currentThresholds.branches, total.branches.pct),
      functions: Math.max(currentThresholds.functions, total.functions.pct),
      lines: Math.max(currentThresholds.lines, total.lines.pct),
    };

    // Check if thresholds have changed
    const hasChanged =
      newThresholds.statements !== currentThresholds.statements ||
      newThresholds.branches !== currentThresholds.branches ||
      newThresholds.functions !== currentThresholds.functions ||
      newThresholds.lines !== currentThresholds.lines;

    if (hasChanged) {
      // Save the updated thresholds
      saveThresholds(newThresholds);
      console.log('Coverage thresholds have been updated:');
      console.log(`- Statements: ${currentThresholds.statements}% -> ${newThresholds.statements}%`);
      console.log(`- Branches: ${currentThresholds.branches}% -> ${newThresholds.branches}%`);
      console.log(`- Functions: ${currentThresholds.functions}% -> ${newThresholds.functions}%`);
      console.log(`- Lines: ${currentThresholds.lines}% -> ${newThresholds.lines}%`);
    } else {
      console.log('Coverage thresholds remain unchanged.');
    }
  } catch (error) {
    console.error('Error updating coverage thresholds:', (error as Error).message);
  }
}

// Run the update
updateThresholds();
