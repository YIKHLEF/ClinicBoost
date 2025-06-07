#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 * 
 * Validates test coverage meets minimum thresholds
 */

const fs = require('fs');
const path = require('path');

class CoverageThresholdChecker {
  constructor() {
    this.thresholds = {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    };
    
    this.coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  }

  /**
   * Check coverage thresholds
   */
  async checkThresholds() {
    console.log('📊 Checking test coverage thresholds...\n');

    try {
      if (!fs.existsSync(this.coveragePath)) {
        throw new Error('Coverage report not found. Run tests with coverage first.');
      }

      const coverage = JSON.parse(fs.readFileSync(this.coveragePath, 'utf8'));
      const results = this.validateCoverage(coverage);
      
      this.printResults(results);
      
      if (results.passed) {
        console.log('\n✅ All coverage thresholds met!');
        process.exit(0);
      } else {
        console.log('\n❌ Coverage thresholds not met!');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Coverage check failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate coverage against thresholds
   */
  validateCoverage(coverage) {
    const total = coverage.total;
    const results = {
      passed: true,
      metrics: {}
    };

    for (const [metric, threshold] of Object.entries(this.thresholds)) {
      const actual = total[metric]?.pct || 0;
      const passed = actual >= threshold;
      
      results.metrics[metric] = {
        actual,
        threshold,
        passed,
        difference: actual - threshold
      };
      
      if (!passed) {
        results.passed = false;
      }
    }

    return results;
  }

  /**
   * Print coverage results
   */
  printResults(results) {
    console.log('Coverage Results:');
    console.log('================');
    
    for (const [metric, data] of Object.entries(results.metrics)) {
      const status = data.passed ? '✅' : '❌';
      const diff = data.difference >= 0 ? `+${data.difference.toFixed(1)}` : data.difference.toFixed(1);
      
      console.log(`${status} ${metric.padEnd(12)}: ${data.actual.toFixed(1)}% (threshold: ${data.threshold}%, ${diff}%)`);
    }
  }

  /**
   * Get coverage recommendations
   */
  getRecommendations(results) {
    const recommendations = [];
    
    for (const [metric, data] of Object.entries(results.metrics)) {
      if (!data.passed) {
        const needed = Math.ceil(data.threshold - data.actual);
        recommendations.push(`Increase ${metric} coverage by ${needed}% to meet threshold`);
      }
    }
    
    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new CoverageThresholdChecker();
  checker.checkThresholds();
}

module.exports = CoverageThresholdChecker;
