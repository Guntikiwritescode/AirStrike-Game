#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Design system validation rules
const DESIGN_SYSTEM_RULES = {
  colors: {
    allowed: [
      'bg', 'panel', 'panel2', 'ink', 'muted', 
      'accent', 'accent2', 'warn', 'grid'
    ],
    forbidden: /var\(--color-(?!bg|panel|panel2|ink|muted|accent|accent2|warn|grid)\w*\)/g
  },
  
  typography: {
    allowedSizes: [
      'text-xs', 'text-sm', 'text-base', 
      'text-lg', 'text-xl', 'text-2xl'
    ],
    forbiddenPatterns: [
      /font-size:\s*\d+px/g,
      /fontSize:\s*['"`]\d+px['"`]/g,
      /style={{.*fontSize.*}}/g
    ]
  },
  
  spacing: {
    allowedClasses: /^[mp][trblxy]?-\d+$/,
    forbiddenPatterns: [
      /[mp][trblxy]?-\[[^}]+\]/g, // Arbitrary values like m-[13px]
      /margin:\s*\d+px/g,
      /padding:\s*\d+px/g
    ]
  },
  
  borderRadius: {
    allowed: ['rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'],
    forbidden: /border-radius:\s*\d+px/g
  }
};

// File patterns to check
const FILE_PATTERNS = {
  components: ['app/**/*.{ts,tsx,js,jsx}', 'components/**/*.{ts,tsx,js,jsx}'],
  styles: ['**/*.css', 'app/globals.css', 'tailwind.config.ts'],
  config: ['tailwind.config.ts', 'next.config.ts']
};

// Validation results container
class ValidationResults {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  add(test, passed, details = {}) {
    const result = {
      test,
      passed,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    this.results.push(result);
    
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
    
    return result;
  }
  
  get total() {
    return this.passed + this.failed;
  }
  
  get success() {
    return this.failed === 0;
  }
  
  summary() {
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      success: this.success,
      results: this.results
    };
  }
}

// Find files matching patterns
function findFiles(patterns, exclude = ['node_modules/**', '.next/**', 'dist/**']) {
  const files = new Set();
  
  patterns.forEach(pattern => {
    try {
      const globPattern = pattern.replace(/\*\*/g, '*');
      const result = execSync(`find . -path "./${globPattern}" -type f 2>/dev/null || true`, { 
        encoding: 'utf8' 
      });
      
      result.split('\n')
        .filter(file => file.trim())
        .filter(file => !exclude.some(ex => file.includes(ex.replace('/**', ''))))
        .forEach(file => files.add(file.trim()));
    } catch (error) {
      console.warn(`Warning: Could not process pattern ${pattern}:`, error.message);
    }
  });
  
  return Array.from(files);
}

// Validate color token usage
function validateColorTokens(results) {
  console.log('🎨 Validating color token usage...');
  
  const componentFiles = findFiles(FILE_PATTERNS.components);
  const violations = [];
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hex colors
      const hexColors = content.match(/#[0-9a-fA-F]{6}/g);
      if (hexColors) {
        hexColors.forEach(hex => {
          violations.push({
            file,
            type: 'hex-color',
            value: hex,
            line: getLineNumber(content, hex)
          });
        });
      }
      
      // Check for rgb/rgba values
      const rgbColors = content.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g);
      if (rgbColors) {
        rgbColors.forEach(rgb => {
          violations.push({
            file,
            type: 'rgb-color',
            value: rgb,
            line: getLineNumber(content, rgb)
          });
        });
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message);
    }
  });
  
  if (violations.length === 0) {
    results.add('color-tokens', true, {
      message: 'All colors use design tokens',
      filesChecked: componentFiles.length
    });
  } else {
    results.add('color-tokens', false, {
      message: `Found ${violations.length} color token violations`,
      violations: violations.slice(0, 10), // Show first 10
      totalViolations: violations.length,
      filesChecked: componentFiles.length
    });
  }
}

// Validate typography scale
function validateTypographyScale(results) {
  console.log('📝 Validating typography scale...');
  
  const componentFiles = findFiles(FILE_PATTERNS.components);
  const violations = [];
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded font-size
      DESIGN_SYSTEM_RULES.typography.forbiddenPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              file,
              type: 'hardcoded-font-size',
              value: match,
              line: getLineNumber(content, match)
            });
          });
        }
      });
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message);
    }
  });
  
  if (violations.length === 0) {
    results.add('typography-scale', true, {
      message: 'All typography uses scale classes',
      filesChecked: componentFiles.length
    });
  } else {
    results.add('typography-scale', false, {
      message: `Found ${violations.length} typography violations`,
      violations: violations.slice(0, 10),
      totalViolations: violations.length,
      filesChecked: componentFiles.length
    });
  }
}

// Validate spacing grid
function validateSpacingGrid(results) {
  console.log('📏 Validating spacing grid...');
  
  const componentFiles = findFiles(FILE_PATTERNS.components);
  const violations = [];
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for arbitrary spacing values
      DESIGN_SYSTEM_RULES.spacing.forbiddenPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              file,
              type: 'arbitrary-spacing',
              value: match,
              line: getLineNumber(content, match)
            });
          });
        }
      });
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message);
    }
  });
  
  if (violations.length === 0) {
    results.add('spacing-grid', true, {
      message: 'All spacing follows 8px grid',
      filesChecked: componentFiles.length
    });
  } else {
    results.add('spacing-grid', false, {
      message: `Found ${violations.length} spacing violations`,
      violations: violations.slice(0, 10),
      totalViolations: violations.length,
      filesChecked: componentFiles.length,
      suggestion: 'Use standard Tailwind spacing classes (p-1, p-2, p-4, etc.)'
    });
  }
}

// Validate border radius consistency
function validateBorderRadius(results) {
  console.log('🔲 Validating border radius consistency...');
  
  const componentFiles = findFiles(FILE_PATTERNS.components);
  const violations = [];
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded border-radius
      const hardcodedRadius = content.match(DESIGN_SYSTEM_RULES.borderRadius.forbidden);
      if (hardcodedRadius) {
        hardcodedRadius.forEach(radius => {
          violations.push({
            file,
            type: 'hardcoded-border-radius',
            value: radius,
            line: getLineNumber(content, radius)
          });
        });
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message);
    }
  });
  
  if (violations.length === 0) {
    results.add('border-radius', true, {
      message: 'All border radius uses system classes',
      filesChecked: componentFiles.length
    });
  } else {
    results.add('border-radius', false, {
      message: `Found ${violations.length} border radius violations`,
      violations: violations.slice(0, 10),
      totalViolations: violations.length,
      filesChecked: componentFiles.length
    });
  }
}

// Validate Tailwind config
function validateTailwindConfig(results) {
  console.log('⚙️ Validating Tailwind configuration...');
  
  try {
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    
    if (!fs.existsSync(configPath)) {
      results.add('tailwind-config', false, {
        message: 'Tailwind config file not found',
        expectedPath: configPath
      });
      return;
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    
    // Check for required design tokens (as CSS variables)
    const requiredTokens = DESIGN_SYSTEM_RULES.colors.allowed;
    const missingTokens = [];
    
    requiredTokens.forEach(token => {
      // Check for token as key in colors object
      const tokenPattern = new RegExp(`${token}:\\s*["'][^"']+["']`, 'g');
      if (!tokenPattern.test(config)) {
        missingTokens.push(token);
      }
    });
    
    if (missingTokens.length === 0) {
      results.add('tailwind-config', true, {
        message: 'All required design tokens present',
        tokensChecked: requiredTokens.length
      });
    } else {
      results.add('tailwind-config', false, {
        message: `Missing design tokens: ${missingTokens.join(', ')}`,
        missingTokens,
        requiredTokens
      });
    }
    
  } catch (error) {
    results.add('tailwind-config', false, {
      message: 'Error validating Tailwind config',
      error: error.message
    });
  }
}

// Validate accessibility compliance
function validateAccessibility(results) {
  console.log('♿ Validating accessibility compliance...');
  
  const componentFiles = findFiles(FILE_PATTERNS.components);
  const issues = [];
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for missing alt attributes on images
      const images = content.match(/<img[^>]*>/g);
      if (images) {
        images.forEach(img => {
          if (!img.includes('alt=')) {
            issues.push({
              file,
              type: 'missing-alt',
              element: img.substring(0, 50) + '...',
              line: getLineNumber(content, img)
            });
          }
        });
      }
      
      // Check for buttons without accessible names
      const buttons = content.match(/<button[^>]*>/g);
      if (buttons) {
        buttons.forEach(button => {
          if (!button.includes('aria-label') && !button.match(/>[^<]+</)) {
            issues.push({
              file,
              type: 'button-no-accessible-name',
              element: button.substring(0, 50) + '...',
              line: getLineNumber(content, button)
            });
          }
        });
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message);
    }
  });
  
  if (issues.length === 0) {
    results.add('accessibility', true, {
      message: 'No accessibility violations found',
      filesChecked: componentFiles.length
    });
  } else {
    results.add('accessibility', false, {
      message: `Found ${issues.length} accessibility issues`,
      issues: issues.slice(0, 10),
      totalIssues: issues.length,
      filesChecked: componentFiles.length
    });
  }
}

// Helper function to get line number for a match
function getLineNumber(content, searchString) {
  const lines = content.substring(0, content.indexOf(searchString)).split('\n');
  return lines.length;
}

// Generate detailed report
function generateReport(results) {
  const summary = results.summary();
  
  console.log('\n🎨 Visual Consistency Report');
  console.log('=============================\n');
  
  summary.results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} ${result.test}: ${status}`);
    console.log(`   ${result.message}`);
    
    if (result.filesChecked) {
      console.log(`   Files checked: ${result.filesChecked}`);
    }
    
    if (result.violations && result.violations.length > 0) {
      console.log('   Violations:');
      result.violations.forEach(violation => {
        console.log(`     - ${violation.file}:${violation.line} → ${violation.value}`);
      });
      
      if (result.totalViolations > result.violations.length) {
        console.log(`     ... and ${result.totalViolations - result.violations.length} more`);
      }
    }
    
    if (result.suggestion) {
      console.log(`   💡 Suggestion: ${result.suggestion}`);
    }
    
    console.log('');
  });
  
  console.log(`📊 Summary: ${summary.passed}/${summary.total} tests passed\n`);
  
  if (summary.success) {
    console.log('🎉 All visual consistency checks passed!');
    return 0;
  } else {
    console.log('💥 Visual consistency violations detected. Please address issues.');
    return 1;
  }
}

// Main validation function
function validateVisualConsistency() {
  console.log('🎯 Visual Consistency Validation\n');
  
  const results = new ValidationResults();
  
  // Run all validations
  validateColorTokens(results);
  validateTypographyScale(results);
  validateSpacingGrid(results);
  validateBorderRadius(results);
  validateTailwindConfig(results);
  validateAccessibility(results);
  
  // Generate report and exit with appropriate code
  const exitCode = generateReport(results);
  
  // Save results for CI
  const reportPath = path.join(process.cwd(), 'visual-consistency-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results.summary(), null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  process.exit(exitCode);
}

// Run validation if called directly
if (require.main === module) {
  validateVisualConsistency();
}

module.exports = {
  validateVisualConsistency,
  validateColorTokens,
  validateTypographyScale,
  validateSpacingGrid,
  validateBorderRadius,
  validateTailwindConfig,
  validateAccessibility,
  DESIGN_SYSTEM_RULES
};