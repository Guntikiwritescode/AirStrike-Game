#!/usr/bin/env node

/**
 * CI Validation Script
 * 
 * This script runs the same validation checks as our local environment
 * to ensure consistency between local development and CI.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running CI validation checks...\n');

let exitCode = 0;

function runCommand(command, description) {
  console.log(`📋 ${description}`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} - PASSED`);
    if (output.trim()) {
      console.log(output);
    }
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ ${description} - FAILED`);
    console.error(error.stdout || error.message);
    console.log('');
    exitCode = 1;
    return false;
  }
}

// Run validation checks in order
const checks = [
  {
    command: 'npm run lint',
    description: 'ESLint validation (warnings allowed)'
  },
  {
    command: 'npm run test:visual',
    description: 'Visual consistency validation'
  },
  {
    command: 'npm run build',
    description: 'Production build validation'
  },
  {
    command: 'npm run test:performance',
    description: 'Performance budget validation'
  }
];

console.log('🎯 Running validation checks...\n');

for (const check of checks) {
  runCommand(check.command, check.description);
}

if (exitCode === 0) {
  console.log('🎉 All CI validation checks passed!');
  console.log('✅ Ready for deployment');
} else {
  console.error('💥 Some validation checks failed');
  console.error('❌ Please fix issues before merging');
}

process.exit(exitCode);