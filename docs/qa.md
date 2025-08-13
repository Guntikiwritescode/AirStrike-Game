# QA Checklist & Performance Budgets

## Performance Budgets 🎯

### Frame Time Performance
- **Frame time p95 < 10ms** (60 FPS target with 6ms headroom)
- **Frame time p99 < 16ms** (no dropped frames under normal load)
- **Animation frame time < 8ms** (smooth micro-interactions)
- **Input latency < 50ms** (immediate tactile feedback)

### CPU & Memory Budgets
- **Idle CPU < 5%** (efficient background processing)
- **Peak CPU < 80%** (during heavy interactions)
- **GC stop-the-world < 20ms** (no noticeable pauses)
- **Memory growth < 50MB/hour** (no memory leaks)
- **Web Worker utilization 10-30%** (offloaded calculations)

### Network & Loading
- **Initial bundle size < 500KB** (fast first paint)
- **Route transition < 200ms** (immediate navigation)
- **Texture loading < 1s** (map tiles, 3D models)
- **API response time < 300ms** (worker calculations)

### Device-Specific Targets
- **1080p 60 FPS** (primary target resolution)
- **DPR 1-3 support** (crisp on all displays)
- **Touch latency < 100ms** (tablet compatibility)
- **Low-end device 30 FPS** (fallback performance)

---

## Comprehensive Test Plan 🧪

### 1. Resize & Responsiveness Testing

#### Desktop Resize Test
```bash
# Test cases:
- 1920×1080 → 1366×768 (common laptop)
- 2560×1440 → 1920×1080 (4K to FHD)
- Ultrawide 3440×1440 → 1920×1080
- Window resize during active gameplay
- Browser zoom 50% to 200%
```

**Expected Results:**
- ✅ No layout shift or jump
- ✅ Map tiles reload correctly
- ✅ UI panels resize smoothly
- ✅ Text remains readable at all zoom levels
- ✅ Canvas DPR scaling updates properly

#### Mobile & Tablet Testing
```bash
# Device classes:
- iPhone 14 Pro (393×852, DPR 3)
- iPad Pro (1024×1366, DPR 2)
- Android flagship (412×915, DPR 2.75)
- Low-end Android (360×640, DPR 1.5)
```

### 2. DPR (Device Pixel Ratio) Testing

#### Multi-DPR Validation
```bash
# Browser DevTools simulation:
DPR 1.0: Standard monitor (1920×1080)
DPR 1.5: Windows scaling 150%
DPR 2.0: MacBook Retina, iPad
DPR 3.0: iPhone Pro, high-end Android
```

**Critical Checkpoints:**
- ✅ Canvas rendering stays crisp
- ✅ SVG icons scale properly
- ✅ Text remains sharp
- ✅ Heatmap legends readable
- ✅ 3D terrain textures high-quality
- ✅ No pixelated elements

### 3. Keyboard Shortcuts Testing

#### Primary Shortcuts
```javascript
// Sensor switching
"1" → Optical sensor
"2" → Radar sensor  
"3" → Thermal sensor

// View modes
"E" → Expected Value heatmap
"V" → Variance/VOI layer
"R" → Risk assessment
"P" → Posterior probability
"T" → Ground truth

// Actions
"S" → Strike mode
"L" → Toggle labels
"Space" → Play/pause
"Escape" → Cancel/deselect

// Interface
"Ctrl+D" → Debug panel
"Ctrl+H" → Help modal
```

**Test Matrix:**
- ✅ All shortcuts work when map has focus
- ✅ No shortcuts trigger when typing in inputs
- ✅ Help modal shows correct bindings
- ✅ Visual feedback for mode changes
- ✅ Shortcuts work with modifier keys (Ctrl/Cmd)

### 4. Tooltip & Hover Testing

#### Hover Performance
```bash
# Test scenarios:
- Rapid mouse movement across entities
- Hover during heatmap transitions
- Tooltip display on 500+ entities
- Touch/tap tooltip behavior
- Tooltip positioning near screen edges
```

**Performance Requirements:**
- ✅ Tooltip appears < 16ms after hover
- ✅ No jitter during mouse movement
- ✅ Content formatting correct (monospace data)
- ✅ No tooltip memory leaks
- ✅ Smooth fade in/out animations

### 5. Heatmap Toggle Performance

#### Layer Switching Stress Test
```javascript
// Rapid mode switching test
const modes = ['posterior', 'expectedValue', 'variance', 'riskAverse', 'truth'];
const rapidSwitch = () => {
  modes.forEach((mode, i) => {
    setTimeout(() => setActiveLayer(mode), i * 100);
  });
};
```

**Success Criteria:**
- ✅ Smooth 180ms transitions
- ✅ No flicker or artifacts
- ✅ Legend updates correctly
- ✅ Performance stays >30 FPS
- ✅ Memory usage stable

### 6. High-Entity Load Testing

#### 500+ Entity Stress Test
```bash
# Load scenarios:
- 500 infrastructure entities
- 200 aircraft with flight paths
- 100 tactical boundaries
- 50 sensor cones (animated)
- All overlays active simultaneously
```

**Performance Validation:**
- ✅ Frame rate stays >30 FPS
- ✅ Zoom/pan remains smooth
- ✅ Entity selection responsive
- ✅ No culling artifacts
- ✅ Memory usage < 512MB

---

## Visual Consistency Validation 🎨

### 1. Color Token Audit

#### Design System Colors Only
```css
/* ALLOWED tokens only: */
--color-bg: #0B0F14
--color-panel: #0E131A
--color-panel2: #121924
--color-ink: #E6EDF3
--color-muted: #9FB2C6
--color-accent: #55E3FF
--color-accent2: #20C6F7
--color-warn: #FF6B6B
--color-grid: #1B2430

/* FORBIDDEN: Any hex codes directly in components */
```

**Audit Command:**
```bash
# Search for stray hex colors
grep -r "#[0-9a-fA-F]\{6\}" app/ components/ lib/ --exclude-dir=node_modules
# Should return ZERO results in component files
```

### 2. Typography Scale Validation

#### Clamp() Scale System
```css
/* Required responsive typography: */
.text-xs   → clamp(11px, 2.5vw, 12px)
.text-sm   → clamp(12px, 2.5vw, 13px)  
.text-base → clamp(13px, 2.5vw, 14px)
.text-lg   → clamp(15px, 2.5vw, 16px)
.text-xl   → clamp(18px, 2.5vw, 20px)
.text-2xl  → clamp(24px, 2.5vw, 28px)

/* Monospace for telemetry: */
font-family: 'JetBrains Mono', 'Courier New', monospace
```

**Validation Checklist:**
- ✅ No hardcoded font-size values
- ✅ All telemetry uses monospace
- ✅ Responsive scaling works 320px-3840px
- ✅ Line heights maintain readability

### 3. Spacing Grid Validation

#### 8px Grid System
```css
/* Base unit: 8px (0.5rem) */
gap-1  → 4px   (0.5 × base)
gap-2  → 8px   (1 × base)  
gap-3  → 12px  (1.5 × base)
gap-4  → 16px  (2 × base)
gap-6  → 24px  (3 × base)
gap-8  → 32px  (4 × base)

/* Custom spacing must be multiple of 4px */
```

**Grid Audit:**
- ✅ All margins/padding use Tailwind classes
- ✅ No arbitrary values like `m-[13px]`
- ✅ Component spacing consistent
- ✅ Panel gaps follow 8px grid

### 4. Border Radius & Shadows

#### Consistent Radius System
```css
/* Tactical design system: */
rounded-lg  → 8px   (components)
rounded-xl  → 12px  (cards) 
rounded-2xl → 16px  (panels)

/* Shadow policy: NONE */
box-shadow: none; /* Always */
```

---

## Automated Testing Setup 🤖

### 1. Performance Monitoring

#### Web Vitals Integration
```javascript
// components/monitoring/WebVitals.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);  // Cumulative Layout Shift < 0.1
  getFID(console.log);  // First Input Delay < 100ms
  getFCP(console.log);  // First Contentful Paint < 1.8s
  getLCP(console.log);  // Largest Contentful Paint < 2.5s
  getTTFB(console.log); // Time to First Byte < 800ms
}
```

#### Custom Performance Hooks
```javascript
// lib/hooks/usePerformanceMonitor.ts
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    frameTime: [],
    cpuUsage: 0,
    memoryUsage: 0,
    gcEvents: []
  });
  
  // Performance observer for frame timing
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      // Track frame times, GC events
    });
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }, []);
}
```

### 2. Visual Regression Testing

#### Playwright Visual Tests
```javascript
// tests/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Consistency', () => {
  test('heatmap transitions', async ({ page }) => {
    await page.goto('/game');
    
    // Test each heatmap mode
    const modes = ['posterior', 'expectedValue', 'variance', 'riskAverse'];
    for (const mode of modes) {
      await page.keyboard.press(getModeKey(mode));
      await page.waitForTimeout(200); // Wait for transition
      await expect(page).toHaveScreenshot(`heatmap-${mode}.png`);
    }
  });

  test('responsive layouts', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page).toHaveScreenshot(`layout-${viewport.width}x${viewport.height}.png`);
    }
  });
});
```

### 3. Performance Budget CI

#### GitHub Actions Workflow
```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    branches: [main, ui-overhaul]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
          
      - name: Performance Budget Check
        run: |
          # Check if performance budgets are met
          node scripts/check-performance-budget.js
```

#### Budget Validation Script
```javascript
// scripts/check-performance-budget.js
const fs = require('fs');

const BUDGETS = {
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300
};

function validatePerformanceBudget(lighthouseResults) {
  const audits = lighthouseResults.audits;
  let passed = true;
  
  Object.entries(BUDGETS).forEach(([metric, budget]) => {
    const score = audits[metric]?.numericValue;
    if (score > budget) {
      console.error(`❌ ${metric}: ${score} > ${budget}`);
      passed = false;
    } else {
      console.log(`✅ ${metric}: ${score} <= ${budget}`);
    }
  });
  
  process.exit(passed ? 0 : 1);
}
```

---

## Manual QA Checklist ✅

### Pre-Release Validation

#### Core Functionality
- [ ] Game initializes without errors
- [ ] All sensors respond correctly (1/2/3 keys)
- [ ] Heatmap transitions smooth (E/V/R/P/T keys)
- [ ] 3D map renders with terrain
- [ ] Flight paths display correctly
- [ ] Entity tooltips show proper data

#### Performance Validation
- [ ] Debug panel shows frame time < 10ms p95
- [ ] No GC pauses > 20ms during gameplay
- [ ] Memory usage stable during 10min session
- [ ] CPU usage < 5% when idle
- [ ] 60 FPS maintained at 1080p

#### Visual Consistency
- [ ] No hex colors in component code
- [ ] All spacing follows 8px grid
- [ ] Typography scales properly
- [ ] Focus rings consistently styled
- [ ] Dark theme colors match design tokens

#### Device Compatibility  
- [ ] Crisp rendering on DPR 1/2/3 displays
- [ ] Responsive layout 320px-3840px
- [ ] Touch interactions work on tablets
- [ ] Keyboard shortcuts accessible

#### Accessibility
- [ ] Focus indicators visible
- [ ] Keyboard navigation complete
- [ ] Color contrast > 4.5:1 ratio
- [ ] Screen reader compatible
- [ ] Motion respects user preferences

---

## Automated QA Integration 🔄

### CI/CD Pipeline Checks

#### Pull Request Validation
```bash
# Performance regression detection
npm run build:analyze
npm run test:performance
npm run lighthouse:ci

# Visual regression testing
npm run test:visual
npm run test:e2e

# Code quality gates
npm run lint:strict
npm run type-check
npm run audit:security
```

#### Performance Monitoring
- **Bundle size tracking** (prevent regressions)
- **Lighthouse CI integration** (Web Vitals)
- **Memory leak detection** (heap snapshots)
- **Frame time monitoring** (real user metrics)

### Success Criteria
- ✅ All performance budgets met
- ✅ Visual regression tests pass  
- ✅ No accessibility violations
- ✅ TypeScript strict mode clean
- ✅ Zero critical security issues

---

## Performance Budget Dashboard 📊

### Real-Time Monitoring
```javascript
// Real-time performance tracking
const performanceMetrics = {
  frameTime: {
    current: '7.2ms',
    p95: '9.8ms',
    budget: '10ms',
    status: 'PASS'
  },
  cpuUsage: {
    current: '3.2%',
    budget: '5%',
    status: 'PASS'
  },
  memoryGrowth: {
    current: '12MB/hour',
    budget: '50MB/hour', 
    status: 'PASS'
  },
  bundleSize: {
    current: '418KB',
    budget: '500KB',
    status: 'PASS'
  }
};
```

### Regression Alerts
- **Frame time budget exceeded** → Slack alert
- **Bundle size increased > 10%** → Block PR merge
- **Memory leak detected** → Engineering review required
- **Accessibility violations** → UX team notification

This comprehensive QA framework ensures the tactical interface maintains professional performance and visual standards! 🎯⚡✨