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
    console.log('💾 Coverage results saved successfully to:', resultsPath);
  } catch (error) {
    console.error('❌ Error saving results file:', (error as Error).message);
  }
}

/**
 * Main function to update coverage thresholds
 */
function updateThresholds(): void {
  try {
    // Check if coverage summary exists
    if (!fs.existsSync(coverageSummaryPath)) {
      console.log('⚠️ No coverage summary found. Skipping threshold update.');
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

      console.log('┌─────────────────────────────────────────────┐');
      console.log('│                                             │');
      console.log('│   📈 Coverage results have been updated! 📈    │');
      console.log('│                                             │');
      console.log('└─────────────────────────────────────────────┘');

      console.log('\nCoverage Changes:');

      // Display statements with appropriate emoji
      const statementsChange = newResults.statements - currentThresholds.statements;
      const statementsEmoji = statementsChange > 0 ? '🔼' : statementsChange < 0 ? '🔽' : '➡️';
      console.log(
        `  ${statementsEmoji} Statements: ${currentThresholds.statements.toFixed(2)}% → ${newResults.statements.toFixed(2)}% (${statementsChange > 0 ? '+' : ''}${statementsChange.toFixed(2)}%)`,
      );

      // Display branches with appropriate emoji
      const branchesChange = newResults.branches - currentThresholds.branches;
      const branchesEmoji = branchesChange > 0 ? '🔼' : branchesChange < 0 ? '🔽' : '➡️';
      console.log(
        `  ${branchesEmoji} Branches:   ${currentThresholds.branches.toFixed(2)}% → ${newResults.branches.toFixed(2)}% (${branchesChange > 0 ? '+' : ''}${branchesChange.toFixed(2)}%)`,
      );

      // Display functions with appropriate emoji
      const functionsChange = newResults.functions - currentThresholds.functions;
      const functionsEmoji = functionsChange > 0 ? '🔼' : functionsChange < 0 ? '🔽' : '➡️';
      console.log(
        `  ${functionsEmoji} Functions:  ${currentThresholds.functions.toFixed(2)}% → ${newResults.functions.toFixed(2)}% (${functionsChange > 0 ? '+' : ''}${functionsChange.toFixed(2)}%)`,
      );

      // Display lines with appropriate emoji
      const linesChange = newResults.lines - currentThresholds.lines;
      const linesEmoji = linesChange > 0 ? '🔼' : linesChange < 0 ? '🔽' : '➡️';
      console.log(
        `  ${linesEmoji} Lines:      ${currentThresholds.lines.toFixed(2)}% → ${newResults.lines.toFixed(2)}% (${linesChange > 0 ? '+' : ''}${linesChange.toFixed(2)}%)`,
      );
    } else {
      console.log('┌─────────────────────────────────────────────┐');
      console.log('│                                             │');
      console.log('│   🛡️  Coverage results remain unchanged! 🛡️    │');
      console.log('│                                             │');
      console.log('└─────────────────────────────────────────────┘');

      console.log('\nCurrent Coverage Metrics:');
      console.log(`  ✓ Statements: ${newResults.statements.toFixed(2)}%`);
      console.log(`  ✓ Branches:   ${newResults.branches.toFixed(2)}%`);
      console.log(`  ✓ Functions:  ${newResults.functions.toFixed(2)}%`);
      console.log(`  ✓ Lines:      ${newResults.lines.toFixed(2)}%`);
    }
  } catch (error) {
    console.error('Error updating coverage results:', (error as Error).message);
  }
}

// Run the update
updateThresholds();
