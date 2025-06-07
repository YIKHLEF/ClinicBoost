#!/usr/bin/env node

/**
 * Comprehensive Test Report Generator
 * 
 * Aggregates results from all test types and generates unified reports
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF_NAME || 'local',
      results: {},
      summary: {},
      recommendations: [],
      qualityGates: {}
    };
  }

  /**
   * Generate comprehensive report from all test artifacts
   */
  async generateReport() {
    console.log('📊 Generating comprehensive test report...');

    try {
      // Collect all test results
      await this.collectUnitTestResults();
      await this.collectIntegrationTestResults();
      await this.collectAccessibilityResults();
      await this.collectPerformanceResults();
      await this.collectLoadTestResults();
      await this.collectE2EResults();

      // Generate summary and recommendations
      this.generateSummary();
      this.generateRecommendations();
      this.evaluateQualityGates();

      // Write reports
      await this.writeJSONReport();
      await this.writeHTMLReport();
      await this.writeMarkdownReport();

      console.log('✅ Comprehensive report generated successfully');
      
    } catch (error) {
      console.error('❌ Failed to generate comprehensive report:', error);
      process.exit(1);
    }
  }

  /**
   * Collect unit test results
   */
  async collectUnitTestResults() {
    try {
      const coveragePath = this.findFile(['coverage/coverage-summary.json', 'test-results-*/coverage-summary.json']);
      if (coveragePath) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.reportData.results.unit = {
          success: coverage.total.lines.pct >= 90,
          coverage: {
            lines: coverage.total.lines.pct,
            functions: coverage.total.functions.pct,
            branches: coverage.total.branches.pct,
            statements: coverage.total.statements.pct
          },
          threshold: 90
        };
      }
    } catch (error) {
      console.warn('Could not collect unit test results:', error.message);
      this.reportData.results.unit = { success: false, error: error.message };
    }
  }

  /**
   * Collect integration test results
   */
  async collectIntegrationTestResults() {
    try {
      // Look for integration test results
      const integrationResults = this.findFile(['test-results.xml', 'test-results-*/test-results.xml']);
      if (integrationResults) {
        // Parse XML results (simplified)
        const content = fs.readFileSync(integrationResults, 'utf8');
        const testsMatch = content.match(/tests="(\d+)"/);
        const failuresMatch = content.match(/failures="(\d+)"/);
        
        const totalTests = testsMatch ? parseInt(testsMatch[1]) : 0;
        const failures = failuresMatch ? parseInt(failuresMatch[1]) : 0;
        
        this.reportData.results.integration = {
          success: failures === 0,
          totalTests,
          failures,
          passed: totalTests - failures
        };
      }
    } catch (error) {
      console.warn('Could not collect integration test results:', error.message);
      this.reportData.results.integration = { success: false, error: error.message };
    }
  }

  /**
   * Collect accessibility test results
   */
  async collectAccessibilityResults() {
    try {
      const a11yPath = this.findFile(['reports/accessibility-report.json', 'accessibility-report/accessibility-report.json']);
      if (a11yPath) {
        const a11yReport = JSON.parse(fs.readFileSync(a11yPath, 'utf8'));
        this.reportData.results.accessibility = {
          success: a11yReport.score >= 95,
          score: a11yReport.score,
          violations: a11yReport.violations?.length || 0,
          criticalIssues: a11yReport.criticalIssues?.length || 0,
          threshold: 95
        };
      }
    } catch (error) {
      console.warn('Could not collect accessibility results:', error.message);
      this.reportData.results.accessibility = { success: false, error: error.message };
    }
  }

  /**
   * Collect performance test results
   */
  async collectPerformanceResults() {
    try {
      const perfPath = this.findFile(['reports/performance-report.json', 'performance-report/performance-report.json']);
      const lighthousePath = this.findFile(['reports/lighthouse.json', 'performance-report/lighthouse.json']);
      
      let perfData = { success: true };
      
      if (perfPath) {
        const perfReport = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
        perfData = {
          success: perfReport.averageRenderTime <= 100,
          renderTime: perfReport.averageRenderTime,
          memoryUsage: perfReport.memoryUsage,
          threshold: 100
        };
      }
      
      if (lighthousePath) {
        const lighthouse = JSON.parse(fs.readFileSync(lighthousePath, 'utf8'));
        perfData.lighthouse = {
          performance: lighthouse.lhr?.categories?.performance?.score * 100,
          accessibility: lighthouse.lhr?.categories?.accessibility?.score * 100,
          bestPractices: lighthouse.lhr?.categories?.['best-practices']?.score * 100,
          seo: lighthouse.lhr?.categories?.seo?.score * 100
        };
      }
      
      this.reportData.results.performance = perfData;
    } catch (error) {
      console.warn('Could not collect performance results:', error.message);
      this.reportData.results.performance = { success: false, error: error.message };
    }
  }

  /**
   * Collect load test results
   */
  async collectLoadTestResults() {
    try {
      const loadPath = this.findFile(['reports/load-test-results.json', 'load-test-report/load-test-results.json']);
      if (loadPath) {
        const loadReport = JSON.parse(fs.readFileSync(loadPath, 'utf8'));
        const totalRequests = loadReport.aggregate?.counters?.['http.requests'] || 0;
        const errors = (loadReport.aggregate?.counters?.['http.codes.4xx'] || 0) + 
                      (loadReport.aggregate?.counters?.['http.codes.5xx'] || 0);
        const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
        
        this.reportData.results.load = {
          success: errorRate < 5,
          errorRate,
          totalRequests,
          averageResponseTime: loadReport.aggregate?.latency?.mean,
          p95ResponseTime: loadReport.aggregate?.latency?.p95,
          throughput: loadReport.aggregate?.rates?.mean
        };
      }
    } catch (error) {
      console.warn('Could not collect load test results:', error.message);
      this.reportData.results.load = { success: false, error: error.message };
    }
  }

  /**
   * Collect E2E test results
   */
  async collectE2EResults() {
    try {
      const e2ePaths = this.findFiles(['e2e-report-*/results.json', 'playwright-report/results.json']);
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      
      for (const e2ePath of e2ePaths) {
        if (fs.existsSync(e2ePath)) {
          const e2eReport = JSON.parse(fs.readFileSync(e2ePath, 'utf8'));
          totalTests += e2eReport.stats?.total || 0;
          passedTests += e2eReport.stats?.passed || 0;
          failedTests += e2eReport.stats?.failed || 0;
        }
      }
      
      this.reportData.results.e2e = {
        success: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        browsers: e2ePaths.length
      };
    } catch (error) {
      console.warn('Could not collect E2E results:', error.message);
      this.reportData.results.e2e = { success: false, error: error.message };
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const results = Object.values(this.reportData.results);
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    
    this.reportData.summary = {
      totalTestTypes: totalTests,
      passedTestTypes: passedTests,
      failedTestTypes: totalTests - passedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      overallStatus: passedTests === totalTests ? 'PASSED' : 'FAILED'
    };
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.reportData.results.unit?.coverage?.lines < 90) {
      recommendations.push(`Increase unit test coverage from ${this.reportData.results.unit.coverage.lines}% to 90%`);
    }
    
    if (this.reportData.results.accessibility?.score < 95) {
      recommendations.push(`Improve accessibility score from ${this.reportData.results.accessibility.score}% to 95%`);
    }
    
    if (this.reportData.results.performance?.renderTime > 100) {
      recommendations.push(`Optimize render time from ${this.reportData.results.performance.renderTime}ms to <100ms`);
    }
    
    if (this.reportData.results.load?.errorRate > 5) {
      recommendations.push(`Reduce load test error rate from ${this.reportData.results.load.errorRate}% to <5%`);
    }
    
    if (this.reportData.results.e2e?.failedTests > 0) {
      recommendations.push(`Fix ${this.reportData.results.e2e.failedTests} failing E2E tests`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All quality gates passed! Consider implementing additional test scenarios.');
    }
    
    this.reportData.recommendations = recommendations;
  }

  /**
   * Evaluate quality gates
   */
  evaluateQualityGates() {
    this.reportData.qualityGates = {
      coverage: {
        passed: this.reportData.results.unit?.coverage?.lines >= 90,
        threshold: 90,
        actual: this.reportData.results.unit?.coverage?.lines || 0
      },
      accessibility: {
        passed: this.reportData.results.accessibility?.score >= 95,
        threshold: 95,
        actual: this.reportData.results.accessibility?.score || 0
      },
      performance: {
        passed: this.reportData.results.performance?.renderTime <= 100,
        threshold: 100,
        actual: this.reportData.results.performance?.renderTime || 0
      },
      reliability: {
        passed: this.reportData.results.load?.errorRate <= 5,
        threshold: 5,
        actual: this.reportData.results.load?.errorRate || 0
      }
    };
  }

  /**
   * Write JSON report
   */
  async writeJSONReport() {
    const reportPath = path.join(process.cwd(), 'reports', 'comprehensive-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
    console.log(`📄 JSON report: ${reportPath}`);
  }

  /**
   * Write HTML report
   */
  async writeHTMLReport() {
    const htmlContent = this.generateHTMLContent();
    const reportPath = path.join(process.cwd(), 'reports', 'comprehensive-report.html');
    fs.writeFileSync(reportPath, htmlContent);
    console.log(`🌐 HTML report: ${reportPath}`);
  }

  /**
   * Write Markdown report
   */
  async writeMarkdownReport() {
    const mdContent = this.generateMarkdownContent();
    const reportPath = path.join(process.cwd(), 'reports', 'comprehensive-report.md');
    fs.writeFileSync(reportPath, mdContent);
    console.log(`📝 Markdown report: ${reportPath}`);
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent() {
    const { results, summary, recommendations, qualityGates } = this.reportData;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClinicBoost - Comprehensive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .test-results { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 20px 0; }
        .test-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9em; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .recommendations { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 20px 0; }
        .recommendation { padding: 10px; margin: 5px 0; background: #fff3cd; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 ClinicBoost - Comprehensive Test Report</h1>
            <p><strong>Generated:</strong> ${this.reportData.timestamp}</p>
            <p><strong>Environment:</strong> ${this.reportData.environment}</p>
            <p><strong>Branch:</strong> ${this.reportData.branch}</p>
            <p><strong>Commit:</strong> ${this.reportData.commit}</p>
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <h3>Overall Status</h3>
                <div class="metric-value ${summary.overallStatus === 'PASSED' ? 'success' : 'danger'}">
                    ${summary.overallStatus}
                </div>
                <p>Success Rate: ${summary.successRate.toFixed(1)}%</p>
            </div>
            <div class="metric-card">
                <h3>Test Coverage</h3>
                <div class="metric-value ${results.unit?.coverage?.lines >= 90 ? 'success' : 'warning'}">
                    ${results.unit?.coverage?.lines?.toFixed(1) || 'N/A'}%
                </div>
                <p>Target: 90%</p>
            </div>
            <div class="metric-card">
                <h3>Accessibility Score</h3>
                <div class="metric-value ${results.accessibility?.score >= 95 ? 'success' : 'warning'}">
                    ${results.accessibility?.score || 'N/A'}%
                </div>
                <p>Target: 95%</p>
            </div>
            <div class="metric-card">
                <h3>Performance</h3>
                <div class="metric-value ${results.performance?.renderTime <= 100 ? 'success' : 'warning'}">
                    ${results.performance?.renderTime || 'N/A'}ms
                </div>
                <p>Target: <100ms</p>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Results</h2>
            ${Object.entries(results).map(([type, result]) => `
                <div class="test-row">
                    <div>
                        <strong>${type.charAt(0).toUpperCase() + type.slice(1)} Tests</strong>
                        <div style="font-size: 0.9em; color: #666;">
                            ${this.getTestDetails(type, result)}
                        </div>
                    </div>
                    <span class="status-badge ${result.success ? 'status-passed' : 'status-failed'}">
                        ${result.success ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h2>📋 Recommendations</h2>
            ${recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown content
   */
  generateMarkdownContent() {
    const { results, summary, recommendations } = this.reportData;
    
    return `# 🧪 ClinicBoost - Comprehensive Test Report

**Generated:** ${this.reportData.timestamp}  
**Environment:** ${this.reportData.environment}  
**Branch:** ${this.reportData.branch}  
**Commit:** ${this.reportData.commit}

## 📊 Summary

| Metric | Value | Status |
|--------|-------|--------|
| Overall Status | ${summary.overallStatus} | ${summary.overallStatus === 'PASSED' ? '✅' : '❌'} |
| Success Rate | ${summary.successRate.toFixed(1)}% | ${summary.successRate === 100 ? '✅' : '⚠️'} |
| Test Types Passed | ${summary.passedTestTypes}/${summary.totalTestTypes} | ${summary.passedTestTypes === summary.totalTestTypes ? '✅' : '❌'} |

## 🧪 Test Results

| Test Type | Status | Details |
|-----------|--------|---------|
${Object.entries(results).map(([type, result]) => 
  `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${result.success ? '✅' : '❌'} | ${this.getTestDetails(type, result)} |`
).join('\n')}

## 📋 Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

## 🎯 Quality Gates

${Object.entries(this.reportData.qualityGates).map(([gate, data]) => 
  `- **${gate.charAt(0).toUpperCase() + gate.slice(1)}**: ${data.passed ? '✅' : '❌'} (${data.actual}/${data.threshold})`
).join('\n')}
`;
  }

  /**
   * Get test details for display
   */
  getTestDetails(type, result) {
    switch (type) {
      case 'unit':
        return `Coverage: ${result.coverage?.lines?.toFixed(1) || 'N/A'}%`;
      case 'accessibility':
        return `Score: ${result.score || 'N/A'}%, Violations: ${result.violations || 0}`;
      case 'performance':
        return `Render: ${result.renderTime || 'N/A'}ms`;
      case 'load':
        return `Error Rate: ${result.errorRate?.toFixed(2) || 'N/A'}%`;
      case 'e2e':
        return `${result.passedTests || 0}/${result.totalTests || 0} tests passed`;
      default:
        return result.error || 'No details available';
    }
  }

  /**
   * Helper methods
   */
  findFile(patterns) {
    for (const pattern of patterns) {
      const files = this.findFiles([pattern]);
      if (files.length > 0) return files[0];
    }
    return null;
  }

  findFiles(patterns) {
    const files = [];
    for (const pattern of patterns) {
      try {
        const matches = require('glob').sync(pattern, { cwd: process.cwd() });
        files.push(...matches.map(m => path.join(process.cwd(), m)));
      } catch (error) {
        // Glob not available, try direct file check
        const filePath = path.join(process.cwd(), pattern);
        if (fs.existsSync(filePath)) {
          files.push(filePath);
        }
      }
    }
    return files;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ComprehensiveReportGenerator();
  generator.generateReport();
}

module.exports = ComprehensiveReportGenerator;
