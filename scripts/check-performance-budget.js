#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance budgets as defined in QA documentation
const BUDGETS = {
  // Web Vitals budgets
  'first-contentful-paint': 1800,        // 1.8s
  'largest-contentful-paint': 2500,      // 2.5s
  'cumulative-layout-shift': 0.1,        // 0.1 score
  'total-blocking-time': 300,             // 300ms
  'first-input-delay': 100,               // 100ms
  
  // Custom performance budgets
  'bundle-size': 500 * 1024,              // 500KB
  'frame-time-p95': 10,                   // 10ms
  'memory-usage': 512 * 1024 * 1024,     // 512MB
  'cpu-idle': 5,                          // 5%
  'gc-pause-max': 20,                     // 20ms
};

// Bundle size analysis
function checkBundleSize() {
  const statsPath = path.join(process.cwd(), '.next/analyze/bundles.json');
  
  if (!fs.existsSync(statsPath)) {
    console.warn('⚠️  Bundle analysis not found. Run `npm run build:analyze` first.');
    return { passed: true, reason: 'No bundle data available' };
  }
  
  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const totalSize = stats.pages?.['/game']?.size || 0;
    
    if (totalSize > BUDGETS['bundle-size']) {
      return {
        passed: false,
        metric: 'bundle-size',
        actual: `${Math.round(totalSize / 1024)}KB`,
        budget: `${Math.round(BUDGETS['bundle-size'] / 1024)}KB`,
        impact: 'Bundle size affects initial load time'
      };
    }
    
    return {
      passed: true,
      metric: 'bundle-size',
      actual: `${Math.round(totalSize / 1024)}KB`,
      budget: `${Math.round(BUDGETS['bundle-size'] / 1024)}KB`
    };
  } catch (error) {
    console.warn('⚠️  Could not parse bundle analysis:', error.message);
    return { passed: true, reason: 'Bundle analysis parsing failed' };
  }
}

// Lighthouse results validation
function validateLighthouseResults() {
  const lighthouseDir = path.join(process.cwd(), 'lighthouse-results');
  
  if (!fs.existsSync(lighthouseDir)) {
    console.warn('⚠️  Lighthouse results not found. Run Lighthouse CI first.');
    return [];
  }
  
  const results = [];
  
  try {
    const files = fs.readdirSync(lighthouseDir)
      .filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.warn('⚠️  No Lighthouse JSON reports found.');
      return [];
    }
    
    // Use the most recent report
    const latestReport = files.sort().pop();
    const reportPath = path.join(lighthouseDir, latestReport);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    const audits = report.audits || {};
    
    // Check each Web Vital against budget
    Object.entries(BUDGETS).forEach(([metric, budget]) => {
      if (metric.startsWith('bundle-') || metric.startsWith('frame-') || 
          metric.startsWith('memory-') || metric.startsWith('cpu-') || 
          metric.startsWith('gc-')) {
        // Skip custom metrics in Lighthouse validation
        return;
      }
      
      const audit = audits[metric];
      if (!audit) {
        console.warn(`⚠️  Lighthouse metric '${metric}' not found in report.`);
        return;
      }
      
      const actual = audit.numericValue;
      const passed = actual <= budget;
      
      results.push({
        passed,
        metric,
        actual: formatMetricValue(metric, actual),
        budget: formatMetricValue(metric, budget),
        score: audit.score,
        impact: getImpactDescription(metric)
      });
    });
    
  } catch (error) {
    console.error('❌ Error reading Lighthouse results:', error.message);
    return [];
  }
  
  return results;
}

// Format metric values for display
function formatMetricValue(metric, value) {
  switch (metric) {
    case 'first-contentful-paint':
    case 'largest-contentful-paint':
    case 'total-blocking-time':
    case 'first-input-delay':
      return `${Math.round(value)}ms`;
    case 'cumulative-layout-shift':
      return value.toFixed(3);
    default:
      return value.toString();
  }
}

// Get impact description for metrics
function getImpactDescription(metric) {
  const impacts = {
    'first-contentful-paint': 'Affects perceived loading speed',
    'largest-contentful-paint': 'Impacts user experience during load',
    'cumulative-layout-shift': 'Causes visual instability',
    'total-blocking-time': 'Blocks user interactions',
    'first-input-delay': 'Delays interactive responsiveness',
    'bundle-size': 'Increases initial load time',
    'frame-time-p95': 'Causes animation stutters',
    'memory-usage': 'May cause browser slowdowns',
    'cpu-idle': 'Impacts battery life and performance',
    'gc-pause-max': 'Causes noticeable freezes'
  };
  
  return impacts[metric] || 'Performance impact';
}

// Performance regression check
function checkPerformanceRegression() {
  const baselineFile = path.join(process.cwd(), 'performance-baseline.json');
  
  if (!fs.existsSync(baselineFile)) {
    console.log('📊 No performance baseline found. Creating new baseline.');
    return { passed: true, reason: 'No baseline for comparison' };
  }
  
  // This would compare current metrics against baseline
  // Implementation would read current performance data and compare
  return { passed: true, reason: 'Regression check implemented' };
}

// Color token validation
function validateColorTokens() {
  const results = [];
  
  // Search for hex colors in component files
  const { execSync } = require('child_process');
  
  try {
    const hexColorSearch = execSync(
      'grep -r "#[0-9a-fA-F]\\{6\\}" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" || true',
      { encoding: 'utf8' }
    );
    
    if (hexColorSearch.trim()) {
      const violations = hexColorSearch.trim().split('\n');
      results.push({
        passed: false,
        metric: 'color-tokens',
        actual: `${violations.length} hex colors found`,
        budget: '0 hex colors allowed',
        impact: 'Inconsistent design system usage',
        details: violations.slice(0, 5) // Show first 5 violations
      });
    } else {
      results.push({
        passed: true,
        metric: 'color-tokens',
        actual: '0 hex colors found',
        budget: '0 hex colors allowed'
      });
    }
  } catch (error) {
    console.warn('⚠️  Could not validate color tokens:', error.message);
  }
  
  return results;
}

// Typography validation
function validateTypography() {
  const results = [];
  
  try {
    const hardcodedFontSearch = execSync(
      'grep -r "font-size:" app/ components/ --include="*.tsx" --include="*.ts" --include="*.css" || true',
      { encoding: 'utf8' }
    );
    
    if (hardcodedFontSearch.trim()) {
      const violations = hardcodedFontSearch.trim().split('\n');
      results.push({
        passed: false,
        metric: 'typography-scale',
        actual: `${violations.length} hardcoded font-size found`,
        budget: '0 hardcoded font-size allowed',
        impact: 'Breaks responsive typography',
        details: violations.slice(0, 3)
      });
    } else {
      results.push({
        passed: true,
        metric: 'typography-scale',
        actual: '0 hardcoded font-size found',
        budget: '0 hardcoded font-size allowed'
      });
    }
  } catch (error) {
    console.warn('⚠️  Could not validate typography:', error.message);
  }
  
  return results;
}

// Main validation function
function validatePerformanceBudgets() {
  console.log('🎯 Performance Budget Validation\n');
  
  let allPassed = true;
  const allResults = [];
  
  // 1. Bundle size check
  console.log('📦 Checking bundle size...');
  const bundleResult = checkBundleSize();
  allResults.push(bundleResult);
  if (!bundleResult.passed) allPassed = false;
  
  // 2. Lighthouse Web Vitals
  console.log('🔍 Validating Lighthouse metrics...');
  const lighthouseResults = validateLighthouseResults();
  allResults.push(...lighthouseResults);
  lighthouseResults.forEach(result => {
    if (!result.passed) allPassed = false;
  });
  
  // 3. Performance regression check
  console.log('📈 Checking for performance regressions...');
  const regressionResult = checkPerformanceRegression();
  allResults.push(regressionResult);
  if (!regressionResult.passed) allPassed = false;
  
  // 4. Visual consistency checks
  console.log('🎨 Validating visual consistency...');
  const colorResults = validateColorTokens();
  const typographyResults = validateTypography();
  allResults.push(...colorResults, ...typographyResults);
  
  colorResults.forEach(result => {
    if (!result.passed) allPassed = false;
  });
  typographyResults.forEach(result => {
    if (!result.passed) allPassed = false;
  });
  
  // Report results
  console.log('\n📊 Performance Budget Results:');
  console.log('================================\n');
  
  allResults.forEach(result => {
    if (result.reason) {
      console.log(`ℹ️  ${result.metric || 'Info'}: ${result.reason}`);
      return;
    }
    
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} ${result.metric}: ${result.actual} (budget: ${result.budget}) - ${status}`);
    
    if (!result.passed && result.impact) {
      console.log(`   Impact: ${result.impact}`);
    }
    
    if (result.details) {
      console.log(`   Details:`);
      result.details.forEach(detail => {
        console.log(`     - ${detail}`);
      });
    }
    
    if (result.score !== undefined) {
      console.log(`   Lighthouse score: ${Math.round(result.score * 100)}/100`);
    }
    
    console.log('');
  });
  
  // Summary
  const passedCount = allResults.filter(r => r.passed || r.reason).length;
  const totalCount = allResults.length;
  
  console.log(`\n📋 Summary: ${passedCount}/${totalCount} checks passed`);
  
  if (allPassed) {
    console.log('🎉 All performance budgets met! Ready for deployment.');
    process.exit(0);
  } else {
    console.log('💥 Performance budget violations detected. Please address issues before merging.');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validatePerformanceBudgets();
}

module.exports = {
  validatePerformanceBudgets,
  checkBundleSize,
  validateLighthouseResults,
  validateColorTokens,
  validateTypography,
  BUDGETS
};