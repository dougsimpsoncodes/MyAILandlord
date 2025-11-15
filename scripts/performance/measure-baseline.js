#!/usr/bin/env node

/**
 * Performance Baseline Measurement Script
 *
 * Measures key performance metrics and saves baseline data
 * Run this before major changes to establish performance benchmarks
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configuration
const BASELINE_DIR = path.join(__dirname, '../../docs/baselines');
const ITERATIONS = 10; // Number of times to run each test for average

// Ensure baseline directory exists
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

/**
 * Simulated API call measurement
 * Replace with actual API calls when deployed
 */
async function measureApiCall(endpoint, method = 'GET') {
  const start = performance.now();

  // TODO: Replace with actual fetch call
  // const response = await fetch(`${process.env.API_URL}${endpoint}`, {
  //   method,
  //   headers: {
  //     'Authorization': `Bearer ${process.env.TEST_TOKEN}`
  //   }
  // });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));

  const end = performance.now();
  return end - start;
}

/**
 * Measure multiple iterations and calculate percentiles
 */
async function measureEndpoint(name, endpoint, method = 'GET') {
  console.log(`📊 Measuring ${name}...`);

  const measurements = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const duration = await measureApiCall(endpoint, method);
    measurements.push(duration);
    process.stdout.write('.');
  }

  console.log(' Done');

  // Calculate statistics
  measurements.sort((a, b) => a - b);
  const p50 = measurements[Math.floor(ITERATIONS * 0.5)];
  const p95 = measurements[Math.floor(ITERATIONS * 0.95)];
  const p99 = measurements[Math.floor(ITERATIONS * 0.99)];
  const avg = measurements.reduce((a, b) => a + b, 0) / ITERATIONS;

  return {
    name,
    endpoint,
    method,
    measurements: {
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      avg: Math.round(avg),
      min: Math.round(Math.min(...measurements)),
      max: Math.round(Math.max(...measurements)),
    },
    iterations: ITERATIONS,
    unit: 'ms',
  };
}

/**
 * Main measurement function
 */
async function measureBaselines() {
  console.log('🚀 Starting Performance Baseline Measurement\n');
  console.log(`Iterations per test: ${ITERATIONS}`);
  console.log(`Results will be saved to: ${BASELINE_DIR}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../../package.json').version,
    measurements: [],
  };

  try {
    // Measure API endpoints
    results.measurements.push(
      await measureEndpoint('Get Properties (paginated)', '/properties?limit=20', 'GET')
    );

    results.measurements.push(
      await measureEndpoint('Create Property', '/properties', 'POST')
    );

    results.measurements.push(
      await measureEndpoint('Get Maintenance Requests', '/maintenance?limit=20', 'GET')
    );

    results.measurements.push(
      await measureEndpoint('Create Maintenance Request', '/maintenance', 'POST')
    );

    results.measurements.push(
      await measureEndpoint('User Authentication', '/auth/login', 'POST')
    );

    // Save results
    const timestamp = Date.now();
    const filename = `baseline_${timestamp}.json`;
    const filepath = path.join(BASELINE_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

    console.log('\n✅ Baseline measurements complete!');
    console.log(`📁 Saved to: ${filename}\n`);

    // Print summary
    console.log('📈 Summary:');
    console.log('┌─────────────────────────────────────┬────────┬────────┬────────┐');
    console.log('│ Endpoint                            │ p50    │ p95    │ p99    │');
    console.log('├─────────────────────────────────────┼────────┼────────┼────────┤');

    results.measurements.forEach(m => {
      const name = m.name.padEnd(35);
      const p50 = `${m.measurements.p50}ms`.padStart(6);
      const p95 = `${m.measurements.p95}ms`.padStart(6);
      const p99 = `${m.measurements.p99}ms`.padStart(6);
      console.log(`│ ${name} │ ${p50} │ ${p95} │ ${p99} │`);
    });

    console.log('└─────────────────────────────────────┴────────┴────────┴────────┘\n');

    // Check against SLA targets
    console.log('🎯 SLA Compliance:');
    const slaTarget = { p95: 200, p99: 500 };
    let passing = true;

    results.measurements.forEach(m => {
      const p95Pass = m.measurements.p95 < slaTarget.p95;
      const p99Pass = m.measurements.p99 < slaTarget.p99;
      const status = p95Pass && p99Pass ? '✅' : '❌';

      console.log(`${status} ${m.name}: p95=${m.measurements.p95}ms (target <${slaTarget.p95}ms), p99=${m.measurements.p99}ms (target <${slaTarget.p99}ms)`);

      if (!p95Pass || !p99Pass) passing = false;
    });

    console.log('');

    if (!passing) {
      console.log('⚠️  Some measurements exceed SLA targets. Consider optimization.');
      process.exit(1);
    } else {
      console.log('✨ All measurements within SLA targets!');
    }

  } catch (error) {
    console.error('❌ Error during baseline measurement:', error);
    process.exit(1);
  }
}

/**
 * Compare with previous baseline
 */
function compareBaselines() {
  const files = fs.readdirSync(BASELINE_DIR)
    .filter(f => f.startsWith('baseline_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length < 2) {
    console.log('ℹ️  Not enough baselines to compare (need at least 2)');
    return;
  }

  const current = JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, files[0])));
  const previous = JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, files[1])));

  console.log('\n📊 Comparison with Previous Baseline:\n');
  console.log(`Current:  ${new Date(current.timestamp).toLocaleString()}`);
  console.log(`Previous: ${new Date(previous.timestamp).toLocaleString()}\n`);

  current.measurements.forEach(curr => {
    const prev = previous.measurements.find(p => p.name === curr.name);
    if (!prev) return;

    const p95Change = curr.measurements.p95 - prev.measurements.p95;
    const p95ChangePercent = ((p95Change / prev.measurements.p95) * 100).toFixed(1);
    const p95Symbol = p95Change > 0 ? '🔴' : (p95Change < 0 ? '🟢' : '⚪');

    console.log(`${p95Symbol} ${curr.name}:`);
    console.log(`   p95: ${curr.measurements.p95}ms (${p95Change > 0 ? '+' : ''}${p95Change}ms, ${p95Change > 0 ? '+' : ''}${p95ChangePercent}%)`);
  });

  console.log('');
}

// Run measurements
if (require.main === module) {
  measureBaselines()
    .then(() => compareBaselines())
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { measureBaselines, measureEndpoint };
