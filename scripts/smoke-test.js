#!/usr/bin/env node

/**
 * Basic smoke test for the Bayesian Forward Operator game
 * Checks critical functionality without relying on complex test suites
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running basic smoke tests...\n');

// Test 1: Check if critical files exist
const criticalFiles = [
  'package.json',
  'next.config.ts',
  'app/page.tsx',
  'lib/types.ts',
  'state/useGameStore.ts',
];

let fileChecksPassed = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    fileChecksPassed = false;
  }
});

// Test 2: Check package.json structure
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.name && pkg.scripts && pkg.dependencies) {
    console.log('✅ package.json structure valid');
  } else {
    console.log('❌ package.json structure invalid');
    fileChecksPassed = false;
  }
  
  // Check for critical dependencies
  const criticalDeps = ['next', 'react', 'zustand'];
  const missingDeps = criticalDeps.filter(dep => !pkg.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ Critical dependencies present');
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
    fileChecksPassed = false;
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  fileChecksPassed = false;
}

// Test 3: Check TypeScript configuration
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsConfig.compilerOptions) {
    console.log('✅ TypeScript configuration valid');
  } else {
    console.log('❌ TypeScript configuration invalid');
    fileChecksPassed = false;
  }
} catch (error) {
  console.log('❌ Error reading tsconfig.json:', error.message);
  fileChecksPassed = false;
}

// Test 4: Basic import/require test for critical modules
const criticalModules = [
  'next',
  'react',
  'zustand',
];

let moduleChecksPassed = true;
criticalModules.forEach(module => {
  try {
    require.resolve(module);
    console.log(`✅ ${module} module available`);
  } catch (error) {
    console.log(`❌ ${module} module unavailable`);
    moduleChecksPassed = false;
  }
});

// Final result
console.log('\n📊 Smoke Test Results:');
console.log(`File checks: ${fileChecksPassed ? 'PASS' : 'FAIL'}`);
console.log(`Module checks: ${moduleChecksPassed ? 'PASS' : 'FAIL'}`);

const overallResult = fileChecksPassed && moduleChecksPassed;
console.log(`Overall: ${overallResult ? 'PASS ✅' : 'FAIL ❌'}\n`);

if (overallResult) {
  console.log('🎉 Basic smoke tests passed! Game infrastructure looks good.');
  process.exit(0);
} else {
  console.log('💥 Basic smoke tests failed! Critical issues detected.');
  process.exit(1);
}