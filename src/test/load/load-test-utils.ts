/**
 * Load Testing Utilities
 * 
 * Utilities for setting up and running load tests
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface LoadTestConfig {
  target: string;
  duration: number;
  arrivalRate: number;
  rampTo?: number;
  scenarios: LoadTestScenario[];
}

export interface LoadTestScenario {
  name: string;
  weight: number;
  flow: LoadTestStep[];
}

export interface LoadTestStep {
  get?: {
    url: string;
    headers?: Record<string, string>;
  };
  post?: {
    url: string;
    headers?: Record<string, string>;
    json?: any;
  };
  think?: number;
}

export interface LoadTestResults {
  summary: {
    duration: number;
    requestsCompleted: number;
    requestsPerSecond: number;
    responseTime: {
      min: number;
      max: number;
      median: number;
      p95: number;
      p99: number;
    };
    errors: number;
    errorRate: number;
  };
  scenarios: Record<string, {
    requestsCompleted: number;
    responseTime: {
      median: number;
      p95: number;
      p99: number;
    };
    errors: number;
  }>;
}

/**
 * Run load test with Artillery
 */
export async function runLoadTest(
  configPath: string,
  outputPath?: string
): Promise<LoadTestResults> {
  return new Promise((resolve, reject) => {
    const args = ['run', configPath];
    
    if (outputPath) {
      args.push('--output', outputPath);
    }

    const artillery = spawn('artillery', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    artillery.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    artillery.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    artillery.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Artillery exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const results = parseArtilleryOutput(stdout);
        resolve(results);
      } catch (error) {
        reject(new Error(`Failed to parse Artillery output: ${error}`));
      }
    });

    artillery.on('error', (error) => {
      reject(new Error(`Failed to start Artillery: ${error}`));
    });
  });
}

/**
 * Parse Artillery output to extract results
 */
function parseArtilleryOutput(output: string): LoadTestResults {
  const lines = output.split('\n');
  const summary: any = {};
  const scenarios: any = {};

  let inSummary = false;
  let inScenarios = false;

  for (const line of lines) {
    if (line.includes('Summary report')) {
      inSummary = true;
      continue;
    }

    if (line.includes('Scenarios launched:')) {
      inScenarios = true;
      continue;
    }

    if (inSummary && line.trim()) {
      // Parse summary metrics
      if (line.includes('http.request_rate:')) {
        summary.requestsPerSecond = parseFloat(line.split(':')[1].trim());
      }
      if (line.includes('http.response_time:')) {
        const timeMatch = line.match(/min: ([\d.]+), max: ([\d.]+), median: ([\d.]+), p95: ([\d.]+), p99: ([\d.]+)/);
        if (timeMatch) {
          summary.responseTime = {
            min: parseFloat(timeMatch[1]),
            max: parseFloat(timeMatch[2]),
            median: parseFloat(timeMatch[3]),
            p95: parseFloat(timeMatch[4]),
            p99: parseFloat(timeMatch[5])
          };
        }
      }
      if (line.includes('http.requests:')) {
        summary.requestsCompleted = parseInt(line.split(':')[1].trim());
      }
      if (line.includes('errors:')) {
        summary.errors = parseInt(line.split(':')[1].trim());
      }
    }
  }

  // Calculate error rate
  summary.errorRate = summary.errors / summary.requestsCompleted * 100;

  return {
    summary,
    scenarios
  };
}

/**
 * Generate load test data
 */
export function generateLoadTestData() {
  const patients = [];
  const appointments = [];

  // Generate test patients
  for (let i = 0; i < 1000; i++) {
    patients.push({
      id: `load-test-patient-${i}`,
      first_name: `LoadTest${i}`,
      last_name: `Patient${i}`,
      email: `loadtest${i}@example.com`,
      phone: `+212${600000000 + i}`,
      date_of_birth: '1990-01-01',
      created_at: new Date().toISOString()
    });
  }

  // Generate test appointments
  for (let i = 0; i < 500; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(i / 10));
    
    appointments.push({
      id: `load-test-appointment-${i}`,
      patient_id: `load-test-patient-${i % 1000}`,
      date: date.toISOString().split('T')[0],
      time: `${9 + (i % 8)}:00`,
      type: ['consultation', 'checkup', 'treatment'][i % 3],
      status: 'scheduled',
      created_at: new Date().toISOString()
    });
  }

  return { patients, appointments };
}

/**
 * Clean up load test data
 */
export async function cleanupLoadTestData() {
  // This would typically connect to your database and clean up test data
  console.log('Cleaning up load test data...');
  
  // Example cleanup (implement based on your database)
  // await supabase
  //   .from('patients')
  //   .delete()
  //   .like('email', 'loadtest%@example.com');
  
  // await supabase
  //   .from('appointments')
  //   .delete()
  //   .like('id', 'load-test-appointment-%');
}

/**
 * Validate load test results against thresholds
 */
export function validateLoadTestResults(
  results: LoadTestResults,
  thresholds: {
    maxResponseTimeP95?: number;
    maxResponseTimeP99?: number;
    minRequestsPerSecond?: number;
    maxErrorRate?: number;
  }
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (thresholds.maxResponseTimeP95 && results.summary.responseTime.p95 > thresholds.maxResponseTimeP95) {
    failures.push(`P95 response time ${results.summary.responseTime.p95}ms exceeds threshold ${thresholds.maxResponseTimeP95}ms`);
  }

  if (thresholds.maxResponseTimeP99 && results.summary.responseTime.p99 > thresholds.maxResponseTimeP99) {
    failures.push(`P99 response time ${results.summary.responseTime.p99}ms exceeds threshold ${thresholds.maxResponseTimeP99}ms`);
  }

  if (thresholds.minRequestsPerSecond && results.summary.requestsPerSecond < thresholds.minRequestsPerSecond) {
    failures.push(`Requests per second ${results.summary.requestsPerSecond} below threshold ${thresholds.minRequestsPerSecond}`);
  }

  if (thresholds.maxErrorRate && results.summary.errorRate > thresholds.maxErrorRate) {
    failures.push(`Error rate ${results.summary.errorRate}% exceeds threshold ${thresholds.maxErrorRate}%`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

/**
 * Generate load test report
 */
export function generateLoadTestReport(
  results: LoadTestResults,
  outputPath: string
): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: results.summary,
    scenarios: results.scenarios,
    recommendations: generateRecommendations(results)
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
}

/**
 * Generate performance recommendations based on results
 */
function generateRecommendations(results: LoadTestResults): string[] {
  const recommendations: string[] = [];

  if (results.summary.responseTime.p95 > 2000) {
    recommendations.push('Consider optimizing database queries and adding caching');
  }

  if (results.summary.errorRate > 5) {
    recommendations.push('Investigate and fix errors causing high error rate');
  }

  if (results.summary.requestsPerSecond < 50) {
    recommendations.push('Consider scaling infrastructure or optimizing application performance');
  }

  return recommendations;
}
