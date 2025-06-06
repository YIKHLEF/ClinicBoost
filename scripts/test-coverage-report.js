#!/usr/bin/env node

/**
 * Test Coverage Report Generator
 * 
 * Generates comprehensive test coverage reports and identifies gaps
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestCoverageReporter {
  constructor() {
    this.projectRoot = process.cwd();
    this.coverageDir = path.join(this.projectRoot, 'coverage');
    this.srcDir = path.join(this.projectRoot, 'src');
    this.testDir = path.join(this.projectRoot, 'src', 'test');
    this.e2eDir = path.join(this.projectRoot, 'e2e');
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    console.log('📊 Generating comprehensive test coverage report...\n');

    try {
      // Run coverage collection
      console.log('🔍 Collecting coverage data...');
      execSync('npm run test:coverage', { stdio: 'inherit' });

      // Read coverage data
      const coverageData = this.readCoverageData();
      
      // Analyze source files
      const sourceFiles = this.analyzeSourceFiles();
      
      // Analyze test files
      const testFiles = this.analyzeTestFiles();
      
      // Generate comprehensive report
      const report = this.generateComprehensiveReport(coverageData, sourceFiles, testFiles);
      
      // Write report
      this.writeReport(report);
      
      // Display summary
      this.displaySummary(report);
      
      return report;
    } catch (error) {
      console.error('❌ Error generating coverage report:', error.message);
      throw error;
    }
  }

  /**
   * Read coverage data from lcov report
   */
  readCoverageData() {
    const coverageJsonPath = path.join(this.coverageDir, 'coverage-summary.json');
    
    if (!fs.existsSync(coverageJsonPath)) {
      throw new Error('Coverage data not found. Run tests with coverage first.');
    }
    
    return JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
  }

  /**
   * Analyze source files
   */
  analyzeSourceFiles() {
    const sourceFiles = [];
    
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'test') {
          scanDirectory(fullPath, relativeFilePath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          sourceFiles.push({
            path: relativeFilePath,
            fullPath,
            type: this.getFileType(relativeFilePath),
            lines: content.split('\n').length,
            complexity: this.calculateComplexity(content),
            exports: this.extractExports(content),
            imports: this.extractImports(content)
          });
        }
      }
    };
    
    scanDirectory(this.srcDir);
    return sourceFiles.filter(file => !file.path.includes('test'));
  }

  /**
   * Analyze test files
   */
  analyzeTestFiles() {
    const testFiles = [];
    
    const scanTestDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          scanTestDirectory(fullPath, relativeFilePath);
        } else if (stat.isFile() && (item.includes('.test.') || item.includes('.spec.'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          testFiles.push({
            path: relativeFilePath,
            fullPath,
            type: this.getTestType(relativeFilePath),
            lines: content.split('\n').length,
            testCases: this.countTestCases(content),
            testedFiles: this.extractTestedFiles(content)
          });
        }
      }
    };
    
    // Scan unit/integration tests
    scanTestDirectory(this.srcDir);
    
    // Scan E2E tests
    scanTestDirectory(this.e2eDir, 'e2e');
    
    return testFiles;
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport(coverageData, sourceFiles, testFiles) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSourceFiles: sourceFiles.length,
        totalTestFiles: testFiles.length,
        totalLines: sourceFiles.reduce((sum, file) => sum + file.lines, 0),
        totalTestCases: testFiles.reduce((sum, file) => sum + file.testCases, 0),
        coverage: coverageData.total
      },
      coverage: {
        byFile: this.analyzeCoverageByFile(coverageData, sourceFiles),
        byType: this.analyzeCoverageByType(coverageData, sourceFiles),
        gaps: this.identifyCoverageGaps(coverageData, sourceFiles)
      },
      testing: {
        distribution: this.analyzeTestDistribution(testFiles),
        gaps: this.identifyTestingGaps(sourceFiles, testFiles),
        recommendations: this.generateTestingRecommendations(sourceFiles, testFiles)
      },
      quality: {
        complexity: this.analyzeComplexity(sourceFiles),
        maintainability: this.analyzeMaintainability(sourceFiles, testFiles)
      }
    };
    
    return report;
  }

  /**
   * Analyze coverage by file
   */
  analyzeCoverageByFile(coverageData, sourceFiles) {
    const filesCoverage = [];
    
    for (const file of sourceFiles) {
      const normalizedPath = file.path.replace(/\\/g, '/');
      const coverageKey = Object.keys(coverageData).find(key => 
        key.includes(normalizedPath) || normalizedPath.includes(key.replace(/^.*\/src\//, ''))
      );
      
      const coverage = coverageKey ? coverageData[coverageKey] : null;
      
      filesCoverage.push({
        file: file.path,
        type: file.type,
        lines: file.lines,
        complexity: file.complexity,
        coverage: coverage ? {
          statements: coverage.statements.pct,
          branches: coverage.branches.pct,
          functions: coverage.functions.pct,
          lines: coverage.lines.pct
        } : null,
        priority: this.calculateTestPriority(file, coverage)
      });
    }
    
    return filesCoverage.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze coverage by file type
   */
  analyzeCoverageByType(coverageData, sourceFiles) {
    const typeStats = {};
    
    for (const file of sourceFiles) {
      if (!typeStats[file.type]) {
        typeStats[file.type] = {
          files: 0,
          totalLines: 0,
          coveredFiles: 0,
          avgCoverage: 0
        };
      }
      
      typeStats[file.type].files++;
      typeStats[file.type].totalLines += file.lines;
      
      const normalizedPath = file.path.replace(/\\/g, '/');
      const coverageKey = Object.keys(coverageData).find(key => 
        key.includes(normalizedPath)
      );
      
      if (coverageKey && coverageData[coverageKey]) {
        typeStats[file.type].coveredFiles++;
        typeStats[file.type].avgCoverage += coverageData[coverageKey].statements.pct;
      }
    }
    
    // Calculate averages
    Object.keys(typeStats).forEach(type => {
      if (typeStats[type].coveredFiles > 0) {
        typeStats[type].avgCoverage /= typeStats[type].coveredFiles;
      }
    });
    
    return typeStats;
  }

  /**
   * Identify coverage gaps
   */
  identifyCoverageGaps(coverageData, sourceFiles) {
    const gaps = {
      uncoveredFiles: [],
      lowCoverageFiles: [],
      complexUncoveredFiles: []
    };
    
    for (const file of sourceFiles) {
      const normalizedPath = file.path.replace(/\\/g, '/');
      const coverageKey = Object.keys(coverageData).find(key => 
        key.includes(normalizedPath)
      );
      
      if (!coverageKey) {
        gaps.uncoveredFiles.push({
          file: file.path,
          type: file.type,
          complexity: file.complexity,
          priority: this.calculateTestPriority(file, null)
        });
      } else {
        const coverage = coverageData[coverageKey];
        if (coverage.statements.pct < 80) {
          gaps.lowCoverageFiles.push({
            file: file.path,
            type: file.type,
            coverage: coverage.statements.pct,
            complexity: file.complexity
          });
        }
        
        if (file.complexity > 10 && coverage.statements.pct < 90) {
          gaps.complexUncoveredFiles.push({
            file: file.path,
            complexity: file.complexity,
            coverage: coverage.statements.pct
          });
        }
      }
    }
    
    return gaps;
  }

  /**
   * Calculate test priority for a file
   */
  calculateTestPriority(file, coverage) {
    let priority = 0;
    
    // Higher priority for complex files
    priority += file.complexity * 2;
    
    // Higher priority for core components
    if (file.type === 'component' || file.type === 'hook' || file.type === 'service') {
      priority += 10;
    }
    
    // Higher priority for uncovered files
    if (!coverage) {
      priority += 20;
    } else if (coverage.statements.pct < 50) {
      priority += 15;
    } else if (coverage.statements.pct < 80) {
      priority += 10;
    }
    
    return priority;
  }

  /**
   * Get file type based on path
   */
  getFileType(filePath) {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/pages/')) return 'page';
    if (filePath.includes('/lib/')) return 'service';
    if (filePath.includes('/utils/')) return 'utility';
    if (filePath.includes('/contexts/')) return 'context';
    if (filePath.includes('/layouts/')) return 'layout';
    return 'other';
  }

  /**
   * Get test type based on path
   */
  getTestType(filePath) {
    if (filePath.includes('e2e/')) return 'e2e';
    if (filePath.includes('.integration.')) return 'integration';
    if (filePath.includes('.performance.')) return 'performance';
    if (filePath.includes('.accessibility.')) return 'accessibility';
    return 'unit';
  }

  /**
   * Calculate code complexity (simplified)
   */
  calculateComplexity(content) {
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s*if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?.*:/g
    ];
    
    let complexity = 1; // Base complexity
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Extract exports from file content
   */
  extractExports(content) {
    const exportMatches = content.match(/export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/g) || [];
    return exportMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[parts.length - 1];
    });
  }

  /**
   * Extract imports from file content
   */
  extractImports(content) {
    const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    return importMatches.map(match => {
      const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
      return fromMatch ? fromMatch[1] : '';
    });
  }

  /**
   * Count test cases in file
   */
  countTestCases(content) {
    const testMatches = content.match(/(it|test)\s*\(/g) || [];
    return testMatches.length;
  }

  /**
   * Extract tested files from test content
   */
  extractTestedFiles(content) {
    const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    return importMatches
      .map(match => {
        const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        return fromMatch ? fromMatch[1] : '';
      })
      .filter(path => path.startsWith('../') || path.startsWith('./'))
      .filter(path => !path.includes('test') && !path.includes('mock'));
  }

  /**
   * Write report to file
   */
  writeReport(report) {
    const reportPath = path.join(this.projectRoot, 'test-results', 'coverage-analysis.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Display summary
   */
  displaySummary(report) {
    console.log('\n📊 Test Coverage Summary:');
    console.log(`📁 Source Files: ${report.summary.totalSourceFiles}`);
    console.log(`🧪 Test Files: ${report.summary.totalTestFiles}`);
    console.log(`📝 Total Test Cases: ${report.summary.totalTestCases}`);
    console.log(`📈 Overall Coverage: ${report.summary.coverage.statements.pct}%`);
    
    console.log('\n🎯 Coverage by Type:');
    Object.entries(report.coverage.byType).forEach(([type, stats]) => {
      console.log(`  ${type}: ${stats.avgCoverage.toFixed(1)}% (${stats.coveredFiles}/${stats.files} files)`);
    });
    
    console.log('\n⚠️  Coverage Gaps:');
    console.log(`  Uncovered Files: ${report.coverage.gaps.uncoveredFiles.length}`);
    console.log(`  Low Coverage Files: ${report.coverage.gaps.lowCoverageFiles.length}`);
    console.log(`  Complex Uncovered Files: ${report.coverage.gaps.complexUncoveredFiles.length}`);
    
    if (report.testing.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.testing.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }

  /**
   * Analyze test distribution
   */
  analyzeTestDistribution(testFiles) {
    const distribution = {};
    
    testFiles.forEach(file => {
      if (!distribution[file.type]) {
        distribution[file.type] = {
          files: 0,
          testCases: 0
        };
      }
      
      distribution[file.type].files++;
      distribution[file.type].testCases += file.testCases;
    });
    
    return distribution;
  }

  /**
   * Identify testing gaps
   */
  identifyTestingGaps(sourceFiles, testFiles) {
    const testedFiles = new Set();
    
    testFiles.forEach(testFile => {
      testFile.testedFiles.forEach(file => {
        testedFiles.add(file);
      });
    });
    
    const untestedFiles = sourceFiles.filter(file => {
      const relativePath = `./${file.path}`;
      return !testedFiles.has(relativePath) && 
             !testedFiles.has(relativePath.replace('.tsx', '')) &&
             !testedFiles.has(relativePath.replace('.ts', ''));
    });
    
    return {
      untestedFiles: untestedFiles.map(file => ({
        path: file.path,
        type: file.type,
        complexity: file.complexity
      })),
      testCoverage: (sourceFiles.length - untestedFiles.length) / sourceFiles.length * 100
    };
  }

  /**
   * Generate testing recommendations
   */
  generateTestingRecommendations(sourceFiles, testFiles) {
    const recommendations = [];
    
    // Check for missing test types
    const testTypes = new Set(testFiles.map(f => f.type));
    
    if (!testTypes.has('e2e')) {
      recommendations.push('Add end-to-end tests for critical user workflows');
    }
    
    if (!testTypes.has('integration')) {
      recommendations.push('Add integration tests for component interactions');
    }
    
    if (!testTypes.has('performance')) {
      recommendations.push('Add performance tests for critical components');
    }
    
    if (!testTypes.has('accessibility')) {
      recommendations.push('Add accessibility tests for UI components');
    }
    
    // Check test-to-source ratio
    const testRatio = testFiles.length / sourceFiles.length;
    if (testRatio < 0.5) {
      recommendations.push('Increase test coverage - aim for at least 1 test file per 2 source files');
    }
    
    // Check for complex untested files
    const complexFiles = sourceFiles.filter(f => f.complexity > 15);
    if (complexFiles.length > 0) {
      recommendations.push(`Add tests for ${complexFiles.length} high-complexity files`);
    }
    
    return recommendations;
  }

  /**
   * Analyze complexity distribution
   */
  analyzeComplexity(sourceFiles) {
    const complexityBuckets = {
      low: sourceFiles.filter(f => f.complexity <= 5).length,
      medium: sourceFiles.filter(f => f.complexity > 5 && f.complexity <= 15).length,
      high: sourceFiles.filter(f => f.complexity > 15).length
    };
    
    const avgComplexity = sourceFiles.reduce((sum, f) => sum + f.complexity, 0) / sourceFiles.length;
    
    return {
      distribution: complexityBuckets,
      average: avgComplexity,
      highComplexityFiles: sourceFiles
        .filter(f => f.complexity > 15)
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 10)
    };
  }

  /**
   * Analyze maintainability
   */
  analyzeMaintainability(sourceFiles, testFiles) {
    const testCoverageRatio = testFiles.length / sourceFiles.length;
    const avgFileSize = sourceFiles.reduce((sum, f) => sum + f.lines, 0) / sourceFiles.length;
    const largeFiles = sourceFiles.filter(f => f.lines > 200);
    
    return {
      testCoverageRatio,
      averageFileSize: avgFileSize,
      largeFiles: largeFiles.length,
      maintainabilityScore: this.calculateMaintainabilityScore(sourceFiles, testFiles)
    };
  }

  /**
   * Calculate maintainability score
   */
  calculateMaintainabilityScore(sourceFiles, testFiles) {
    let score = 100;
    
    // Deduct for large files
    const largeFiles = sourceFiles.filter(f => f.lines > 200).length;
    score -= largeFiles * 2;
    
    // Deduct for high complexity
    const complexFiles = sourceFiles.filter(f => f.complexity > 15).length;
    score -= complexFiles * 3;
    
    // Add for good test coverage
    const testRatio = testFiles.length / sourceFiles.length;
    score += testRatio * 20;
    
    return Math.max(0, Math.min(100, score));
  }
}

// CLI interface
if (require.main === module) {
  const reporter = new TestCoverageReporter();
  
  reporter.generateCoverageReport()
    .then(() => {
      console.log('\n✅ Coverage analysis complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Coverage analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = TestCoverageReporter;
